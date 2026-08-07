/**
 * Normalises the GIVOO product master export into a file the bulk-upload
 * importer (app/api/admin/products/bulk-upload) can ingest cleanly.
 *
 *   npx tsx scripts/normalize-upload-csv.ts <input.csv> <output.csv>
 *
 * The source sheet writes a literal "0" wherever a cell is empty, carries units
 * inside numeric columns ("7cm", "300 GSM"), and is mojibake-encoded. Fixing
 * those at import time would mean guessing per-column; doing it here keeps the
 * importer honest and leaves an auditable diff.
 */
import { readFileSync, writeFileSync } from 'fs'

// ── CSV read/write (RFC-4180: quotes, embedded commas and newlines) ──
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\r') { /* ignore */ }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else field += c
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
const toCsv = (rows: string[][]) => rows.map((r) => r.map(esc).join(',')).join('\n') + '\n'

// ── Mojibake repair (UTF-8 bytes that were decoded as CP-1252) ──
const MOJIBAKE: [RegExp, string][] = [
  [/â/g, "'"], [/â/g, '"'], [/â/g, '"'],
  [/â/g, '-'], [/â/g, '-'], [/â¦/g, '...'],
  [/â¹/g, 'Rs.'], [/Â°/g, ' deg'], [/â/g, "'"],
  [/â¢/g, ''], [/Â /g, ' '], [/Â/g, ''],
  // Bare "â" left over from a checkmark/dash the export mangled beyond recovery
  [/â(?![-¿])/g, ''],
]
function fixText(s: string): string {
  let out = s
  for (const [re, rep] of MOJIBAKE) out = out.replace(re, rep)
  return out.replace(/[ \t]+/g, ' ').trim()
}

// "0" is the sheet's placeholder for empty. Real zeros never appear in the
// text columns we blank, so treating it as empty is safe there.
const blankIfZero = (v: string) => (v.trim() === '0' ? '' : v.trim())

// "7cm" → "7", "7.6 dia" → "7.6", "150-300g" → "150", "300 GSM" → "300"
function firstNumber(v: string): string {
  const m = v.replace(/,/g, '').match(/[\d.]+/)
  if (!m) return ''
  const n = Number(m[0])
  return Number.isFinite(n) && n > 0 ? String(n) : ''
}

// Pull a 4-8 digit HSN out of prose like "1704 (sugar-coated) / 2106 - CONTESTED"
function cleanHsn(v: string): string {
  const m = v.match(/\b(\d{4,8})\b/)
  return m?.[1] ?? ''
}

/**
 * GST rate per HSN chapter. The sheet carries no gstPercent column, so without
 * this every auto-created HSN would default to 18% — wrong for food and wood,
 * which is a compliance problem, not a cosmetic one.
 */
function gstForHsn(hsn: string): string {
  if (!hsn) return ''
  const h4 = hsn.slice(0, 4)
  const ch = hsn.slice(0, 2)
  if (['0813', '0902', '0901', '1005'].includes(h4)) return '5'   // dry fruit, tea, coffee, kernels
  if (h4 === '2008') return '12'                                   // roasted / flavoured nuts
  if (['4420', '4421'].includes(h4)) return '12'                   // wooden articles
  if (ch === '61' || ch === '62' || h4 === '6505') return '5'      // apparel & caps <= Rs.2,500
  if (h4 === '1806' || h4 === '1704' || h4 === '1905') return '18' // chocolate, confectionery, biscuits
  return '18'
}

// Occasion tags: the sheet's free text ("Hamper component", "Desk drops",
// "Imported-goods angle") would create hundreds of OccasionConfig rows, and
// collections are tag-driven off those. Map to a controlled vocabulary and drop
// anything that isn't a real gifting occasion.
const OCCASION_MAP: [RegExp, string][] = [
  [/diwali|festive|dhanteras/i, 'Diwali & Festive'],
  [/onboard|new joiner|joining|interview/i, 'Onboarding'],
  [/r&r|recognition|reward|milestone|long.?service|award|retirement|incentive/i, 'Recognition & Rewards'],
  [/client|channel partner|vendor gifting|customer/i, 'Client Gifting'],
  // \b on "board" — without it, "Onboarding" matches it.
  [/executive|cxo|\bboard\b|vip|senior|leadership|premium/i, 'Executive Gifting'],
  [/event|conference|trade.?show|giveaway|swag|promotion/i, 'Events & Conferences'],
  [/wellness|health|fitness|gym/i, 'Wellness'],
  // \b on "eco" — without it, "Recognition" matches it.
  [/\beco\b|sustainab|csr/i, 'Sustainable Gifting'],
  [/wfh|hybrid|desk|work.?from.?home|pantry|office/i, 'Work From Home'],
  [/travel|business travel|commut/i, 'Travel'],
  [/women/i, "Women's Day"],
  [/new year/i, 'New Year'],
]
function cleanOccasions(v: string): string {
  const out = new Set<string>()
  for (const raw of v.split(/[,;|]/)) {
    const t = raw.trim()
    if (!t || t === '0') continue
    for (const [re, label] of OCCASION_MAP) if (re.test(t)) out.add(label)
  }
  return [...out].join(', ')
}

// Recipient tags: same treatment, lighter touch — keep short human labels only.
function cleanRecipients(v: string): string {
  const out = new Set<string>()
  for (const raw of v.split(/[,;|]/)) {
    const t = raw.trim().replace(/\s*\(.*?\)\s*/g, '').trim()
    if (!t || t === '0' || t.length > 30) continue
    out.add(t)
  }
  return [...out].join(', ')
}

// Existing category names in the DB — keep the sheet aligned with them rather
// than creating near-duplicates ("Stationery" vs "Stationery & Desk").
const CATEGORY_MAP: Record<string, string> = {
  stationery: 'Stationery & Desk',
  'gourmet & hampers': 'Gourmet & Hampers',
  'bags & travel': 'Bags & Travel',
  'tech & gadgets': 'Tech & Gadgets',
  drinkware: 'Drinkware',
  apparel: 'Apparel',
}

/**
 * descriptionShort renders on catalog cards and product pages. The sheet's
 * version is internal procurement commentary — competitor bulk-desk contacts,
 * margin notes, "PRICE UNVERIFIED", HTTP error codes. Strip it to the customer-
 * safe opening and move the full text to the internal sourcingStatus column.
 */
const INTERNAL_MARKERS = new RegExp(
  [
    // Procurement / sourcing notes
    'PRICE\\s+(UNVERIFIED|NOT|LEFT|IS NOT|CAVEAT)', 'HONEST\\s+(FLAG|ANSWER|NOTE|POSITIONING|STRUCTURAL)',
    'VERIFY', 'RE-VERIFY', 'CONFIRM ', 'WARNING', 'CRITICAL', 'NOTE:', 'FLAG', 'MOQ',
    '\\b[a-z.]+@[a-z]', 'WhatsApp \\+', 'HTTP \\d', 'rate.?limited', 'robots\\.txt',
    'marketplace price', 'not a procurement price', 'SOLD OUT', 'IN STOCK', 'Live price', 'Rs\\.\\d',
    // Internal merchandising / range-positioning language — reads as our own
    // catalogue notes, not product copy.
    'value floor', 'hero (pick|of this)', 'the pick (when|for|of)', 'sub-category',
    '\\b(value|mid|premium|luxury|entry|top)[- ]tier\\b', 'Q\\d\\s*-\\s*[A-Z]',
    '\\bmargin\\b', 'kit.?filler', 'price-to-spec', 'best value', 'step up', 'our (own|catalogue|list)',
    'this (list|catalogue|sheet)', 'assemble-in-house', 'curator', 'GST', 'HSN',
  ].join('|')
)

function cleanShortDescription(v: string): string {
  const text = fixText(blankIfZero(v))
  if (!text) return ''
  // Keep leading sentences until the first one that reads as an internal note.
  const parts = text.split(/(?<=\.)\s+(?=[A-Z(])/)
  const kept: string[] = []
  for (const p of parts) {
    if (INTERNAL_MARKERS.test(p)) break
    kept.push(p)
    if (kept.join(' ').length > 320) break
  }
  const result = kept.join(' ').trim()
  // If the very first sentence was already internal, fall back to nothing
  // rather than shipping half a procurement note.
  return result.length >= 40 ? result : ''
}

// ── Column plan ──
// Dropped outright; everything else passes through with per-column cleaning.
const DROP = new Set(['slug', 'vendorName', 'vendorSku', 'vendorMoq', 'vendorLeadDays', 'altVendorName'])

function main() {
  const [, , inPath, outPath] = process.argv
  if (!inPath || !outPath) {
    console.error('Usage: npx tsx scripts/normalize-upload-csv.ts <input.csv> <output.csv>')
    process.exit(1)
  }

  const rows = parseCsv(readFileSync(inPath, 'latin1'))
  const header = rows[0]
  if (!header) throw new Error('Empty file')
  const body = rows.slice(1).filter((r) => r.some((c) => c.trim() !== ''))

  const idx = (name: string) => header.indexOf(name)
  const col = {
    name: idx('name'), sku: idx('sku'), status: idx('status'),
    isFeatured: idx('isFeatured'), sortOrder: idx('sortOrder'),
    category: idx('category'), subcategory: idx('subcategory'),
    lengthCm: idx('lengthCm'), widthCm: idx('widthCm'), heightCm: idx('heightCm'),
    weightG: idx('weightG'), moq: idx('moq'), leadTimeDays: idx('leadTimeDays'),
    isEco: idx('isEcoCertified'), ecoCert: idx('ecoCertification'),
    hsn: idx('hsnCode'), occasions: idx('occasions'), recipients: idx('recipientTags'),
    descShort: idx('descriptionShort'), descLong: idx('descriptionLong'),
    sourcing: idx('sourcingStatus'), imageUrls: idx('imageUrls'),
    sample: idx('sampleAvailable'),
  }

  // Output header: source columns minus DROP, plus gstPercent after hsnCode.
  const outHeader: string[] = []
  const keepIdx: number[] = []
  header.forEach((h, i) => {
    if (DROP.has(h)) return
    outHeader.push(h)
    keepIdx.push(i)
    if (h === 'hsnCode') { outHeader.push('gstPercent'); keepIdx.push(-1) }
  })

  const stats = {
    rows: 0, dims: 0, weights: 0, hsnFixed: 0, ecoMoved: 0,
    shortTrimmed: 0, shortEmptied: 0, shortFromLong: 0, zeroTiers: 0, featured: 0, imagesParked: 0,
  }
  const tierSellCols = [1, 2, 3, 4, 5, 6].map((t) => idx(`t${t}_sellPrice`))

  const outRows: string[][] = [outHeader]

  for (const r of body) {
    if (!(r[col.name] || '').trim() || !(r[col.sku] || '').trim()) continue
    const cell = (i: number) => (i >= 0 ? (r[i] ?? '') : '')
    const src = [...r]
    stats.rows++

    // Dimensions & weight: strip units, blank the placeholder zeros
    for (const i of [col.lengthCm, col.widthCm, col.heightCm]) {
      if (i < 0) continue
      const fixed = firstNumber(cell(i))
      if (fixed && fixed !== cell(i)) stats.dims++
      src[i] = fixed
    }
    if (col.weightG >= 0) {
      const w = firstNumber(cell(col.weightG))
      if (w !== cell(col.weightG)) stats.weights++
      src[col.weightG] = w
    }

    // Eco: the sheet put the certification TEXT in isEcoCertified and left
    // ecoCertification as "0". Move it back and derive the boolean.
    if (col.isEco >= 0 && col.ecoCert >= 0) {
      const raw = fixText(blankIfZero(cell(col.isEco)))
      if (raw && !/^(yes|no)$/i.test(raw)) {
        src[col.ecoCert] = raw
        // Only a real certification counts — "No formal cert" does not.
        src[col.isEco] = /no formal|no cert|^no\b/i.test(raw) ? 'No' : 'Yes'
        stats.ecoMoved++
      } else {
        src[col.isEco] = /^yes$/i.test(raw) ? 'Yes' : 'No'
        src[col.ecoCert] = ''
      }
    }

    // HSN → bare code, and derive the GST rate it should carry
    const hsn = col.hsn >= 0 ? cleanHsn(cell(col.hsn)) : ''
    if (col.hsn >= 0) {
      if (hsn !== cell(col.hsn).trim()) stats.hsnFixed++
      src[col.hsn] = hsn
    }

    // Featured: sheet uses "0" / mojibake. Treat any non-zero marker as Yes.
    if (col.isFeatured >= 0) {
      const f = cell(col.isFeatured).trim()
      const on = f !== '' && f !== '0'
      src[col.isFeatured] = on ? 'Yes' : 'No'
      if (on) stats.featured++
    }

    if (col.sample >= 0) src[col.sample] = blankIfZero(cell(col.sample)) ? 'Yes' : 'No'

    // Lead time: "0" means unknown, not same-day. Default to a 14-day quote.
    if (col.leadTimeDays >= 0 && !blankIfZero(cell(col.leadTimeDays))) src[col.leadTimeDays] = '14'

    // Category alignment + occasion/recipient vocabularies
    if (col.category >= 0) {
      const c = cell(col.category).trim()
      src[col.category] = CATEGORY_MAP[c.toLowerCase()] ?? c
    }
    if (col.subcategory >= 0) src[col.subcategory] = fixText(blankIfZero(cell(col.subcategory)))
    if (col.occasions >= 0) src[col.occasions] = cleanOccasions(fixText(cell(col.occasions)))
    if (col.recipients >= 0) src[col.recipients] = cleanRecipients(fixText(cell(col.recipients)))

    // Short description: customer-safe only; full note preserved internally
    if (col.descShort >= 0) {
      const original = fixText(blankIfZero(cell(col.descShort)))

      // descriptionLong is clean marketing copy throughout the sheet, whereas
      // descriptionShort is internal merchandising commentary. Prefer the
      // former for the customer-facing blurb and only fall back to a scrubbed
      // version of the latter when there is no long description at all.
      let cleaned = ''
      if (col.descLong >= 0) {
        const long = fixText(blankIfZero(cell(col.descLong)))
        let s = ''
        for (const part of long.split(/(?<=\.)\s+/)) {
          if ((s + ' ' + part).trim().length > 260 && s) break
          s = (s + ' ' + part).trim()
        }
        if (s.length >= 40) { cleaned = s; stats.shortFromLong++ }
      }
      if (!cleaned) cleaned = cleanShortDescription(cell(col.descShort))
      if (cleaned !== original) stats.shortTrimmed++
      if (!cleaned) stats.shortEmptied++
      src[col.descShort] = cleaned
      if (col.sourcing >= 0 && original) {
        const existing = fixText(blankIfZero(cell(col.sourcing)))
        src[col.sourcing] = [existing, original].filter(Boolean).join(' || ')
      }
    }

    // Images: the sheet points at Google Drive FOLDERS, which are not image
    // URLs — importing them would create broken ProductImage rows. Blank the
    // column and keep the folder link as an internal reference so the real
    // images can be matched to the product when they're uploaded.
    if (col.imageUrls >= 0) {
      const link = blankIfZero(cell(col.imageUrls))
      src[col.imageUrls] = ''
      if (link && col.sourcing >= 0) {
        src[col.sourcing] = [src[col.sourcing] ?? '', `Images: ${link}`].filter(Boolean).join(' || ')
        stats.imagesParked++
      }
    }

    // Tier sell prices of 0 would quote that quantity band at Rs.0 — blank them
    // so the importer skips the tier instead of creating a free one.
    for (const i of tierSellCols) {
      if (i < 0) continue
      if (Number(cell(i)) === 0) { src[i] = ''; stats.zeroTiers++ }
    }

    // Build the output row, inserting gstPercent after hsnCode
    const out: string[] = []
    for (let k = 0; k < keepIdx.length; k++) {
      const i = keepIdx[k]!
      if (i === -1) { out.push(gstForHsn(hsn)); continue }
      out.push(fixText(blankIfZero(src[i] ?? '')))
    }
    outRows.push(out)
  }

  writeFileSync(outPath, toCsv(outRows), 'utf8')

  console.log(`Wrote ${outPath}`)
  console.log(`  products:              ${stats.rows}`)
  console.log(`  columns:               ${header.length} -> ${outHeader.length}`)
  console.log(`  dimensions unit-stripped: ${stats.dims}`)
  console.log(`  weights unit-stripped:    ${stats.weights}`)
  console.log(`  HSN codes cleaned:        ${stats.hsnFixed}`)
  console.log(`  eco-cert cells realigned: ${stats.ecoMoved}`)
  console.log(`  featured products:        ${stats.featured}`)
  console.log(`  short descs trimmed:      ${stats.shortTrimmed}`)
  console.log(`  short descs from long:    ${stats.shortFromLong}`)
  console.log(`  short descs still empty:  ${stats.shortEmptied}`)
  console.log(`  Rs.0 price tiers removed: ${stats.zeroTiers}`)
  console.log(`  Drive links parked:       ${stats.imagesParked}`)
}

main()
