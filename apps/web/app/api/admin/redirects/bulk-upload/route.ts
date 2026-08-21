import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import {
  normalizeDestination,
  normalizeSource,
  parseStatus,
  validateRule,
  type RedirectStatus,
} from '@/lib/redirects';

/**
 * POST /api/admin/redirects/bulk-upload
 * Import many redirects at once from a CSV or Excel sheet (super_admin only).
 *
 * One row per URL: old URL, new URL, type, note. A row whose old URL already
 * has a rule is updated rather than duplicated, so a corrected sheet can simply
 * be re-uploaded. Every row is checked on its own — a bad row is reported and
 * skipped, the rest still import.
 */

// Column headings the SEO team is likely to use, normalised → our field name.
const ALIASES: Record<string, string> = {
  source: 'source', 'old url': 'source', 'old link': 'source', from: 'source',
  'from url': 'source', url: 'source', 'redirect from': 'source', '404 url': 'source',
  'broken url': 'source', 'source url': 'source', 'old page': 'source', path: 'source',
  destination: 'destination', 'new url': 'destination', 'new link': 'destination',
  to: 'destination', 'to url': 'destination', 'redirect to': 'destination',
  target: 'destination', 'target url': 'destination', 'new page': 'destination',
  'destination url': 'destination',
  type: 'type', 'redirect type': 'type', status: 'type', 'status code': 'type',
  code: 'type', 'http status': 'type',
  note: 'note', notes: 'note', comment: 'note', remarks: 'note', reason: 'note',
};

function norm(s: any): string {
  return (s ?? '').toString().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Minimal RFC-4180 CSV reader — quoted cells, escaped quotes, CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

interface RowError {
  row: number;
  url: string;
  message: string;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // ── Read CSV or Excel into a row matrix ──
  let matrix: string[][];
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    const fileName = (file.name || '').toLowerCase();
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const buf = Buffer.from(await file.arrayBuffer());
      const wb = XLSX.read(buf, { type: 'buffer' });
      const sheetName = wb.SheetNames.find((s) => /redirect|url|404/i.test(s)) || wb.SheetNames[0];
      const sheet = sheetName ? wb.Sheets[sheetName] : undefined;
      if (!sheet) return NextResponse.json({ error: 'The Excel file has no sheets' }, { status: 400 });
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false, defval: '' });
      matrix = rows.map((r) => (Array.isArray(r) ? r.map((c) => (c == null ? '' : String(c))) : []));
    } else {
      matrix = parseCsv(await file.text());
    }
  } catch (err) {
    console.error('Could not read redirect upload:', err);
    return NextResponse.json({ error: 'Could not read uploaded file' }, { status: 400 });
  }

  matrix = matrix.filter((r) => r.some((c) => (c ?? '').trim() !== ''));
  if (matrix.length < 2) {
    return NextResponse.json(
      { error: 'File must have a header row and at least one redirect row' },
      { status: 400 }
    );
  }

  // ── Map the header row onto our fields ──
  const header = (matrix[0] ?? []).map((h) => ALIASES[norm(h)] ?? '');
  if (!header.includes('source') || !header.includes('destination')) {
    return NextResponse.json(
      {
        error:
          'Could not find the "Old URL" and "New URL" columns. Download the template and keep its headings.',
      },
      { status: 400 }
    );
  }

  const cellAt = (row: string[], field: string) => {
    const idx = header.indexOf(field);
    return idx === -1 ? '' : (row[idx] ?? '').toString().trim();
  };

  // ── Validate every row before writing anything ──
  const errors: RowError[] = [];
  const valid: { source: string; destination: string; status: RedirectStatus; note: string | null }[] = [];
  const seen = new Map<string, number>();

  for (let i = 1; i < matrix.length; i++) {
    const rowNo = i + 1; // 1-based, counting the header — matches the spreadsheet
    const raw = matrix[i] ?? [];
    const source = normalizeSource(cellAt(raw, 'source'));
    const status = parseStatus(cellAt(raw, 'type'));
    if (status === null) {
      errors.push({ row: rowNo, url: source, message: 'Type must be 301, 302 or 410' });
      continue;
    }
    const destination = status === 410 ? '' : normalizeDestination(cellAt(raw, 'destination'));

    const problem = validateRule(source, destination, status);
    if (problem) {
      errors.push({ row: rowNo, url: source || cellAt(raw, 'source'), message: problem });
      continue;
    }

    // Same old URL twice in one sheet — take the last one, flag the earlier.
    const dupe = seen.get(source);
    if (dupe !== undefined) {
      errors.push({ row: dupe, url: source, message: `Listed again on row ${rowNo} — that row was used` });
      valid[valid.findIndex((v) => v.source === source)] = {
        source, destination, status, note: cellAt(raw, 'note') || null,
      };
      seen.set(source, rowNo);
      continue;
    }

    seen.set(source, rowNo);
    valid.push({ source, destination, status, note: cellAt(raw, 'note') || null });
  }

  // ── Chain check against what is already stored, plus within the sheet ──
  const existing = await prisma.urlRedirect.findMany({
    where: { isActive: true },
    select: { source: true, destination: true },
  });
  // The sheet's own rules count as "already there" — importing A→B and B→C
  // together is just as much a chain as adding them one at a time.
  const bySource = new Map<string, string>();
  for (const row of existing) bySource.set(row.source, row.destination);
  for (const row of valid) bySource.set(row.source, row.destination);

  const toWrite = valid.filter((rule) => {
    if (!rule.destination.startsWith('/')) return true;
    const target = rule.destination.endsWith('/*')
      ? rule.destination.slice(0, -2)
      : rule.destination;
    const onward = bySource.get(target);
    if (onward !== undefined && target !== rule.source) {
      errors.push({
        row: seen.get(rule.source) ?? 0,
        url: rule.source,
        message: `${target} is itself redirected to ${onward || '(gone)'} — point this at the final URL`,
      });
      return false;
    }
    return true;
  });

  // ── Write ──
  let created = 0;
  let updated = 0;
  for (const rule of toWrite) {
    try {
      const before = await prisma.urlRedirect.findUnique({
        where: { source: rule.source },
        select: { id: true },
      });
      await prisma.urlRedirect.upsert({
        where: { source: rule.source },
        create: {
          source: rule.source,
          destination: rule.destination,
          statusCode: rule.status,
          note: rule.note,
        },
        update: {
          destination: rule.destination,
          statusCode: rule.status,
          note: rule.note,
          isActive: true,
        },
      });
      if (before) updated++;
      else created++;
    } catch (err) {
      console.error('Failed to save redirect', rule.source, err);
      errors.push({
        row: seen.get(rule.source) ?? 0,
        url: rule.source,
        message: 'Could not be saved — please try again',
      });
    }
  }

  return NextResponse.json({
    total: matrix.length - 1,
    created,
    updated,
    failed: errors.length,
    errors: errors.sort((a, b) => a.row - b.row).slice(0, 200),
  });
}
