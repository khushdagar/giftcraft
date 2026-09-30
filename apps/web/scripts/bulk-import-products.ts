/**
 * Run the admin bulk product import from the command line.
 *
 * Uses the exact same parsing + import code as POST /api/admin/products/bulk-upload
 * (see app/api/admin/products/bulk-upload/route.ts), so the result is identical to
 * uploading the file through the admin page — including Drive image mirroring to
 * the CDN, HSN/category/occasion/vendor auto-creation and price-audit logging.
 *
 * Usage (from apps/web):
 *   npx tsx scripts/bulk-import-products.ts "<path to .xlsx|.csv>" [--sheet "Sheet name"] [--user <userId>]
 *
 * --sheet  Which worksheet to import (defaults to the first sheet).
 * --user   The super_admin User.id to record as the price-audit author.
 *          Defaults to the first super_admin in the database.
 */
import 'dotenv/config';
import fs from 'node:fs';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { importProductMatrix, prepareProductMatrix } from '@/lib/bulk-product-import';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) {
    console.error('Usage: npx tsx scripts/bulk-import-products.ts <file.xlsx|file.csv> [--sheet name] [--user id]');
    process.exit(1);
  }

  const wb = XLSX.read(fs.readFileSync(file), { type: 'buffer' });
  const sheetName = arg('--sheet') ?? wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    console.error(`Sheet "${sheetName}" not found. Sheets: ${wb.SheetNames.join(', ')}`);
    process.exit(1);
  }
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false, defval: '' });
  const matrix = rows.map((r) => (Array.isArray(r) ? r.map((c) => (c == null ? '' : String(c))) : []));

  const prepared = prepareProductMatrix(matrix);
  if ('error' in prepared) {
    console.error(prepared.error);
    process.exit(1);
  }

  let userId = arg('--user');
  if (!userId) {
    const admin = await prisma.user.findFirst({ where: { role: 'super_admin' }, select: { id: true, email: true } });
    if (!admin) {
      console.error('No super_admin user found; pass --user <id>.');
      process.exit(1);
    }
    userId = admin.id;
    console.log(`Recording price audit as ${admin.email}`);
  }

  console.log(`Importing sheet "${sheetName}": ${prepared.dataRows.length} rows`);
  const startedAt = Date.now();
  const summary = await importProductMatrix(prepared, userId, (msg) => {
    if (msg.type === 'progress') {
      process.stdout.write(
        `\r  row ${msg.current}/${msg.total}  created ${msg.created}  failed ${msg.failed}  images ${msg.images}   `
      );
    }
  });
  process.stdout.write('\n');

  console.log(`Done in ${Math.round((Date.now() - startedAt) / 1000)}s`);
  console.log(`  created: ${summary.created}/${summary.total}`);
  console.log(`  failed:  ${summary.failed}`);
  console.log(`  images:  ${summary.images}`);
  for (const e of summary.errors) console.log(`  ERROR row ${e.row} ${e.sku}: ${e.message}`);
  for (const w of summary.warnings) console.log(`  WARN  row ${w.row} ${w.sku}: ${w.message}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
