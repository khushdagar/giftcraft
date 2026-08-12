/**
 * Imports product images from a single public Google Drive folder that holds
 * one SUBFOLDER PER PRODUCT, named with the product's exact name.
 *
 *   npx tsx scripts/import-drive-images-by-name.ts <rootFolderId> [--dry]
 *
 *   --dry   list what would happen, download and upload nothing
 *
 * Products that already have images are ALWAYS skipped — this script only
 * fills in products that have none, then flips them draft -> active.
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
const rootId = args.find((a) => !a.startsWith('--'))
const DRY = args.includes('--dry')

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

/** Normalized key for name matching: lowercase, straight quotes, collapsed spaces. */
function nameKey(s: string): string {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/°/g, ' deg ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Folders may ship two renders of a shot: "01.png" (light backdrop) and
 * "01.1.png" (black). The catalog shows images on gray-50, so keep the light
 * one; numeric collation would otherwise make the black render the cover.
 * Only drops a ".N" variant when its plain sibling exists.
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

/** List a public Drive folder's immediate children (files or subfolders). */
async function listFolder(folderId: string): Promise<{ id: string; name: string }[]> {
  const res = await fetchRetry(`https://drive.google.com/embeddedfolderview?id=${folderId}#list`)
  if (!res.ok) throw new Error(`folder listing returned HTTP ${res.status} (is it shared?)`)
  const html = await res.text()
  const out: { id: string; name: string }[] = []
  const re = /<div class="flip-entry" id="entry-([^"]+)"[\s\S]*?flip-entry-title">([^<]*)</g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const id = m[1]
    const name = decodeEntities(m[2] ?? '').trim()
    if (id && name) out.push({ id, name })
  }
  return out
}

async function main() {
  if (!rootId) {
    console.error('Usage: npx tsx scripts/import-drive-images-by-name.ts <rootFolderId> [--dry]')
    process.exit(1)
  }
  if (!DRY && (!process.env.DO_SPACES_KEY || !process.env.DO_SPACES_SECRET)) {
    console.error('DO_SPACES_KEY / DO_SPACES_SECRET not found in the environment or .env — cannot upload.')
    process.exit(1)
  }

  const subfolders = await listFolder(rootId)
  console.log(`Drive root folder has ${subfolders.length} subfolders.`)

  // Folder name -> folder id (first wins on duplicate names)
  const folderByName = new Map<string, { id: string; label: string }>()
  for (const f of subfolders) {
    const key = nameKey(f.name)
    if (folderByName.has(key)) {
      console.log(`! duplicate folder name, keeping first: "${f.name}"`)
      continue
    }
    folderByName.set(key, { id: f.id, label: f.name })
  }

  const products = await prisma.product.findMany({
    select: {
      id: true, sku: true, name: true, status: true,
      _count: { select: { images: true } },
    },
  })
  const productByName = new Map<string, (typeof products)[number]>()
  for (const p of products) {
    const key = nameKey(p.name)
    if (!productByName.has(key)) productByName.set(key, p)
  }

  if (DRY) console.log('DRY RUN — nothing will be downloaded or uploaded.\n')

  let uploaded = 0
  let productsDone = 0
  let activated = 0
  let skippedExisting = 0
  const failures: { product: string; file: string; message: string }[] = []
  const unmatchedFolders: string[] = []
  const emptyFolders: string[] = []

  async function processOne(key: string, folder: { id: string; label: string }) {
    const product = productByName.get(key)
    if (!product) { unmatchedFolders.push(folder.label); return }

    if (product._count.images > 0) {
      skippedExisting++
      return
    }

    let files: { id: string; name: string }[]
    try {
      files = dropDarkVariants((await listFolder(folder.id)).filter((f) => IMAGE_EXT.test(f.name)))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'listing failed'
      failures.push({ product: product.sku, file: '(folder)', message })
      console.log(`✗ ${product.sku} (${product.name}): ${message}`)
      return
    }
    // Name order decides the cover: 01.png before 02.png.
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

    if (files.length === 0) { emptyFolders.push(folder.label); return }

    let added = 0
    for (const f of files) {
      try {
        if (DRY) { added++; continue }

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
            isPrimary: added === 0,
            sortOrder: added,
            altText: product.name,
          },
        })
        added++
        uploaded++
      } catch (err) {
        const message = err instanceof Error ? err.message : 'failed'
        failures.push({ product: product.sku, file: f.name, message })
        console.log(`  ✗ ${product.sku} / ${f.name}: ${message}`)
      }
    }

    if (added > 0) {
      productsDone++
      if (product.status === 'draft') {
        if (!DRY) {
          await prisma.product.update({ where: { id: product.id }, data: { status: 'active' } })
        }
        activated++
      }
    }
    console.log(`${DRY ? '~' : '✓'} ${product.sku} (${product.name}): ${added}/${files.length} image(s)${product.status === 'draft' && added > 0 ? ' — draft → active' : ''}`)
  }

  // Worker pool: several products in flight at once. Images within a product
  // stay sequential so sortOrder/isPrimary remain deterministic.
  const CONCURRENCY = 5
  const entries = [...folderByName.entries()]
  let next = 0
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < entries.length) {
        const [key, folder] = entries[next++]!
        await processOne(key, folder)
        await sleep(100) // stay polite to Drive between folders
      }
    })
  )

  console.log('\n──────── summary ────────')
  console.log(`  images uploaded:          ${uploaded}`)
  console.log(`  products given images:    ${productsDone}`)
  console.log(`  products draft→active:    ${activated}`)
  console.log(`  skipped (already images): ${skippedExisting}`)
  console.log(`  folders with no images:   ${emptyFolders.length}${emptyFolders.length ? '\n    - ' + emptyFolders.join('\n    - ') : ''}`)
  console.log(`  folders with no product:  ${unmatchedFolders.length}${unmatchedFolders.length ? '\n    - ' + unmatchedFolders.join('\n    - ') : ''}`)
  console.log(`  failures:                 ${failures.length}`)
  for (const f of failures) console.log(`    ${f.product} / ${f.file}: ${f.message}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
