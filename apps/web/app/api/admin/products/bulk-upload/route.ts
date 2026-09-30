import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as XLSX from 'xlsx';
import { importProductMatrix, parseCsv, prepareProductMatrix } from '@/lib/bulk-product-import';

/**
 * POST /api/admin/products/bulk-upload
 * Bulk-create products from a CSV or Excel file (super_admin only).
 * Parsing and import live in lib/bulk-product-import.ts.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  // Capture now — the null-narrowing above is lost inside the nested
  // runImport() closure, so we reference this stable id there instead.
  const userId = session.user.id;

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
      // Prefer a sheet named like "product" if present, else the first
      const sheetName =
        wb.SheetNames.find((s) => /product|master|catalog/i.test(s)) || wb.SheetNames[0];
      const sheet = sheetName ? wb.Sheets[sheetName] : undefined;
      if (!sheet) return NextResponse.json({ error: 'The Excel file has no sheets' }, { status: 400 });
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false, defval: '' });
      matrix = rows.map((r) => (Array.isArray(r) ? r.map((c) => (c == null ? '' : String(c))) : []));
    } else {
      matrix = parseCsv(await file.text());
    }
  } catch (err) {
    console.error('Could not read upload:', err);
    return NextResponse.json({ error: 'Could not read uploaded file' }, { status: 400 });
  }

  const prepared = prepareProductMatrix(matrix);
  if ('error' in prepared) {
    return NextResponse.json({ error: prepared.error }, { status: 400 });
  }

  // Stream NDJSON progress so the client can show a real progress bar
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: any) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      await importProductMatrix(prepared, userId, send);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
