/**
 * Dry-run check on a normalised upload CSV: re-applies the bulk-upload
 * importer's own parsing rules and reports what it would create, without
 * touching the database.
 *
 *   npx tsx scripts/verify-upload-csv.ts <file.csv>
 */
import { readFileSync } from 'fs'

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

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
const toNum = (v?: string) => {
  if (v == null) return null
  const c = String(v).replace(/[₹,%\s]/g, '').trim()
  if (c === '') return null
  const n = Number(c)
  return Number.isFinite(n) ? n : null
}
const toList = (v?: string) => (v || '').split(/[\n,;|]/).map((s) => s.trim()).filter(Boolean)

const file = process.argv[2]
if (!file) { console.error('Usage: npx tsx scripts/verify-upload-csv.ts <file.csv>'); process.exit(1) }

const rows = parseCsv(readFileSync(file, 'utf8')).filter((r) => r.some((c) => c.trim() !== ''))
const header = rows[0]!
const body = rows.slice(1)
const at = (r: string[], name: string) => (r[header.indexOf(name)] ?? '').trim()

const problems: string[] = []
const slugs = new Map<string, string>()
const skus = new Set<string>()
const cats = new Set<string>()
const subcats = new Set<string>()
const occasions = new Set<string>()
const hsnGst = new Map<string, Set<string>>()
let noTiers = 0
let noHsn = 0
let noDims = 0

for (const [i, r] of body.entries()) {
  const rowNum = i + 2
  const name = at(r, 'name')
  const sku = at(r, 'sku')
  if (!name || !sku) { problems.push(`row ${rowNum}: missing name or sku`); continue }

  if (skus.has(sku)) problems.push(`row ${rowNum}: duplicate SKU "${sku}"`)
  skus.add(sku)

  // The importer derives the slug from the name when no slug column exists.
  const slug = slugify(name)
  if (slugs.has(slug)) problems.push(`row ${rowNum}: slug "${slug}" collides with ${slugs.get(slug)}`)
  else slugs.set(slug, sku)

  let tiers = 0
  for (let t = 1; t <= 6; t++) {
    const sell = toNum(at(r, `t${t}_sellPrice`))
    const cost = toNum(at(r, `t${t}_costPrice`))
    if (sell != null || cost != null) tiers++
    if (sell === 0) problems.push(`row ${rowNum} (${sku}): tier ${t} sell price is 0`)
  }
  if (tiers === 0) { noTiers++; problems.push(`row ${rowNum} (${sku}): no price tiers — would be SKIPPED`) }

  const hsn = at(r, 'hsnCode')
  const gst = at(r, 'gstPercent')
  if (!hsn) noHsn++
  else {
    if (!/^\d{4,8}$/.test(hsn)) problems.push(`row ${rowNum} (${sku}): HSN "${hsn}" is not a bare code`)
    if (!hsnGst.has(hsn)) hsnGst.set(hsn, new Set())
    hsnGst.get(hsn)!.add(gst || '(none)')
  }

  for (const f of ['lengthCm', 'widthCm', 'heightCm', 'weightG']) {
    const v = at(r, f)
    if (v && toNum(v) == null) problems.push(`row ${rowNum} (${sku}): ${f}="${v}" is not numeric`)
  }
  if (!at(r, 'lengthCm') && !at(r, 'widthCm') && !at(r, 'heightCm')) noDims++

  const c = at(r, 'category'); if (c) cats.add(c)
  const s = at(r, 'subcategory'); if (s) subcats.add(s)
  toList(at(r, 'occasions')).forEach((o) => occasions.add(o))
}

// An HSN mapped to two different GST rates would create one record and silently
// use whichever rate the first row carried.
const conflicting = [...hsnGst].filter(([, g]) => g.size > 1)

console.log(`Rows:                ${body.length}`)
console.log(`Unique SKUs:         ${skus.size}`)
console.log(`Unique slugs:        ${slugs.size}`)
console.log(`Rows with no tiers:  ${noTiers}`)
console.log(`Rows with no HSN:    ${noHsn}`)
console.log(`Rows with no dims:   ${noDims}`)
console.log(`\nCategories (${cats.size}): ${[...cats].sort().join(', ')}`)
console.log(`\nSub-categories (${subcats.size}): ${[...subcats].sort().join(', ')}`)
console.log(`\nOccasions (${occasions.size}): ${[...occasions].sort().join(', ')}`)
console.log(`\nHSN -> GST (${hsnGst.size}):`)
for (const [h, g] of [...hsnGst].sort()) console.log(`  ${h} -> ${[...g].join(' / ')}`)
if (conflicting.length) {
  console.log(`\nCONFLICTING GST RATES for the same HSN:`)
  for (const [h, g] of conflicting) console.log(`  ${h}: ${[...g].join(' vs ')}`)
}
console.log(`\nProblems: ${problems.length}`)
problems.slice(0, 40).forEach((p) => console.log(`  - ${p}`))
if (problems.length > 40) console.log(`  ... and ${problems.length - 40} more`)
