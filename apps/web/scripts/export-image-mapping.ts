/**
 * Exports a SKU -> Drive-folder mapping so downloaded Drive folders can be
 * renamed to their SKU, zipped, and fed to /admin/products/bulk-images.
 *
 * The Drive links are read from the ORIGINAL master sheet, not the database:
 * the importer only stores sourcingStatus on a ProductVendor row, and the
 * normalised upload deliberately carried no vendor name, so nothing persisted.
 *
 *   npx tsx scripts/export-image-mapping.ts <master.csv> <output.csv>
 */
import { readFileSync, writeFileSync } from 'fs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false }
      else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\r') { /* ignore */ }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else field += c
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

async function main() {
  const [, , masterPath, out = 'image-mapping.csv'] = process.argv
  if (!masterPath) {
    console.error('Usage: npx tsx scripts/export-image-mapping.ts <master.csv> <output.csv>')
    process.exit(1)
  }

  // SKU -> Drive folder, straight from the master sheet
  const sheet = parseCsv(readFileSync(masterPath, 'latin1'))
  const head = sheet[0] ?? []
  const skuCol = head.indexOf('sku')
  const imgCol = head.indexOf('imageUrls')
  const driveBySku = new Map<string, string>()
  for (const r of sheet.slice(1)) {
    const sku = (r[skuCol] ?? '').trim()
    const link = (r[imgCol] ?? '').trim()
    if (sku && link.startsWith('http')) driveBySku.set(sku, link)
  }

  const products = await prisma.product.findMany({
    select: { sku: true, name: true, _count: { select: { images: true } } },
    orderBy: { sku: 'asc' },
  })

  const rows = [['sku', 'name', 'existingImages', 'driveFolder']]
  let withLink = 0
  let withImages = 0

  for (const p of products) {
    const link = driveBySku.get(p.sku) ?? ''
    if (link) withLink++
    if (p._count.images > 0) withImages++
    rows.push([p.sku, p.name, String(p._count.images), link])
  }

  writeFileSync(out, rows.map((r) => r.map(esc).join(',')).join('\n') + '\n', 'utf8')

  console.log(`Wrote ${out}`)
  console.log(`  products:            ${products.length}`)
  console.log(`  with a Drive folder: ${withLink}`)
  console.log(`  already have images: ${withImages}`)
  console.log(`  no image source:     ${products.length - withLink}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
