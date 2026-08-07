/**
 * Pulls product images out of the Google Drive folders listed in the master
 * sheet, uploads them to Digital Ocean Spaces, and attaches them to products.
 *
 *   npx tsx scripts/import-drive-images.ts <master.csv> [--dry] [--force] [--only=SKU,SKU]
 *
 *   --dry     list what would happen, download and upload nothing
 *   --force   also add images to products that already have some
 *             (default: those products are skipped, so re-runs are safe)
 *   --only    restrict to specific SKUs
 *
 * The sheet's imageUrls column points at Drive FOLDERS, not files, so each
 * folder is listed first and every image inside it is fetched. Folders must be
 * shared as "anyone with the link" — the listing endpoint is unauthenticated.
 *
 * Files are ordered by name, so a folder holding 01.png / 02.png / 03.png gets
 * 01.png as the product's cover image.
 */
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// ── Load .env before anything reads process.env (no dotenv dependency here) ──
for (const name of ['.env.local', '.env']) {
  const p = join(process.cwd(), name)
  if (!existsSync(p)) continue
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i)
    if (!m || !m[1]) continue
    if (process.env[m[1]] !== undefined) continue
    process.env[m[1]] = (m[2] ?? '').trim().replace(/^["']|["']$/g, '')
  }
}

/* eslint-disable import/first */
import { PrismaClient } from '@prisma/client'
import { uploadToDigitalOcean } from '../lib/upload-to-digital-ocean'

const prisma = new PrismaClient()

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif)$/i
const args = process.argv.slice(2)
const masterPath = args.find((a) => !a.startsWith('--'))
const DRY = args.includes('--dry')
const FORCE = args.includes('--force')
const ONLY = args.find((a) => a.startsWith('--only='))?.slice(7).split(',').map((s) => s.trim()).filter(Boolean)

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Each folder ships two renders of every shot: "01.png" on a light grey
 * backdrop and "01.1.png" on black. The catalog puts product images on a
 * gray-50 block, so the light render is the one we want — and a dark product
 * on a black backdrop is close to invisible as a thumbnail. Worse, numeric
 * collation sorts "01.1.png" BEFORE "01.png", so the black version would
 * otherwise become the cover.
 *
 * Only drops a ".N" variant when its plain sibling exists, so a folder that
 * happens to contain only ".1" files still yields images.
 */
function dropDarkVariants(files: { id: string; name: string }[]): { id: string; name: string }[] {
  const plain = new Set(
    files.map((f) => f.name.toLowerCase()).filter((n) => !/\.\d+\.[a-z0-9]+$/i.test(n))
  )
  return files.filter((f) => {
    const n = f.name.toLowerCase()
    const m = n.match(/^(.+)\.\d+(\.[a-z0-9]+)$/i)
    if (!m) return true
    return !plain.has(`${m[1]}${m[2]}`)
  })
}

/** Retry around Drive's rate limiting, which shows up as 429/5xx. */
async function fetchRetry(url: string, tries = 4): Promise<Response> {
  let lastErr: unknown
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { redirect: 'follow' })
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`)
      return res
    } catch (err) {
      lastErr = err
      await sleep(1000 * 2 ** i)
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('request failed')
}

/** List a public Drive folder's immediate children. */
async function listFolder(folderId: string): Promise<{ id: string; name: string }[]> {
  const res = await fetchRetry(`https://drive.google.com/embeddedfolderview?id=${folderId}#list`)
  if (!res.ok) throw new Error(`folder listing returned HTTP ${res.status} (is it shared?)`)
  const html = await res.text()
  const out: { id: string; name: string }[] = []
  const re = /<div class="flip-entry" id="entry-([^"]+)"[\s\S]*?flip-entry-title">([^<]*)</g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const id = m[1]
    // Entities appear in filenames; only &amp; is realistic here.
    const name = (m[2] ?? '').replace(/&amp;/g, '&').trim()
    if (id && name) out.push({ id, name })
  }
  return out
}

async function main() {
  if (!masterPath) {
    console.error('Usage: npx tsx scripts/import-drive-images.ts <master.csv> [--dry] [--force] [--only=SKU]')
    process.exit(1)
  }
  if (!DRY && (!process.env.DO_SPACES_KEY || !process.env.DO_SPACES_SECRET)) {
    console.error('DO_SPACES_KEY / DO_SPACES_SECRET not found in the environment or .env — cannot upload.')
    process.exit(1)
  }

  // SKU -> Drive folder id, from the master sheet
  const sheet = parseCsv(readFileSync(masterPath, 'latin1'))
  const head = sheet[0] ?? []
  const skuCol = head.indexOf('sku')
  const imgCol = head.indexOf('imageUrls')
  const folderBySku = new Map<string, string>()
  for (const r of sheet.slice(1)) {
    const sku = (r[skuCol] ?? '').trim()
    const link = (r[imgCol] ?? '').trim()
    const id = link.match(/\/folders\/([A-Za-z0-9_-]+)/)?.[1]
    if (sku && id) folderBySku.set(sku, id)
  }

  const targets = [...folderBySku.keys()].filter((s) => !ONLY || ONLY.includes(s)).sort()
  const products = await prisma.product.findMany({
    where: { sku: { in: targets } },
    select: { id: true, sku: true, name: true, _count: { select: { images: true } } },
  })
  const bySku = new Map(products.map((p) => [p.sku, p]))

  console.log(`${targets.length} SKUs have a Drive folder; ${bySku.size} matched a product.`)
  if (DRY) console.log('DRY RUN — nothing will be downloaded or uploaded.\n')

  let uploaded = 0
  let skippedExisting = 0
  let productsDone = 0
  const failures: { sku: string; file: string; message: string }[] = []
  const noProduct: string[] = []
  const emptyFolders: string[] = []

  for (const sku of targets) {
    const product = bySku.get(sku)
    if (!product) { noProduct.push(sku); continue }

    if (product._count.images > 0 && !FORCE) {
      skippedExisting++
      console.log(`- ${sku}: already has ${product._count.images} image(s) — skipped`)
      continue
    }

    const folderId = folderBySku.get(sku)!
    let files: { id: string; name: string }[]
    try {
      files = dropDarkVariants((await listFolder(folderId)).filter((f) => IMAGE_EXT.test(f.name)))
    } catch (err) {
      failures.push({ sku, file: '(folder)', message: err instanceof Error ? err.message : 'listing failed' })
      console.log(`✗ ${sku}: ${err instanceof Error ? err.message : 'listing failed'}`)
      continue
    }
    // Name order decides the cover: 01.png before 02.png.
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

    if (files.length === 0) { emptyFolders.push(sku); console.log(`- ${sku}: folder has no images`); continue }

    let added = 0
    const startSort = product._count.images
    for (const f of files) {
      try {
        if (DRY) { console.log(`  would upload ${sku} <- ${f.name}`); added++; continue }

        const res = await fetchRetry(`https://drive.google.com/uc?export=download&id=${f.id}`)
        if (!res.ok) throw new Error(`download HTTP ${res.status}`)
        const buf = Buffer.from(await res.arrayBuffer())
        // Drive serves an HTML interstitial instead of the file when it refuses.
        if (buf.subarray(0, 15).toString('utf8').toLowerCase().includes('<html')) {
          throw new Error('Drive returned an HTML page, not the file')
        }

        const file = new File([new Uint8Array(buf)], f.name, {
          type: `image/${(f.name.split('.').pop() || 'jpeg').toLowerCase()}`,
        })
        const url = await uploadToDigitalOcean(file, 'products')

        await prisma.productImage.create({
          data: {
            productId: product.id,
            url,
            isPrimary: startSort === 0 && added === 0,
            sortOrder: startSort + added,
            altText: product.name,
          },
        })
        added++
        uploaded++
      } catch (err) {
        const message = err instanceof Error ? err.message : 'failed'
        failures.push({ sku, file: f.name, message })
        console.log(`  ✗ ${sku} / ${f.name}: ${message}`)
      }
    }
    if (added > 0) productsDone++
    console.log(`${DRY ? '~' : '✓'} ${sku}: ${added}/${files.length} image(s)`)
    await sleep(200) // stay polite to Drive between folders
  }

  console.log('\n──────── summary ────────')
  console.log(`  images uploaded:        ${uploaded}`)
  console.log(`  products updated:       ${productsDone}`)
  console.log(`  skipped (had images):   ${skippedExisting}`)
  console.log(`  folders with no images: ${emptyFolders.length}${emptyFolders.length ? ' — ' + emptyFolders.join(', ') : ''}`)
  console.log(`  SKUs with no product:   ${noProduct.length}${noProduct.length ? ' — ' + noProduct.join(', ') : ''}`)
  console.log(`  failures:               ${failures.length}`)
  for (const f of failures) console.log(`    ${f.sku} / ${f.file}: ${f.message}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
