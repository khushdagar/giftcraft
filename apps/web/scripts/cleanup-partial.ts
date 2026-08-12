import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

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

const prisma = new PrismaClient()

const CLEAN = process.argv.includes('--clean')

async function main() {
  // The interrupted run activates a product only AFTER all its images are in,
  // so a draft product holding images = a partial import. List (and with
  // --clean, delete) those image rows so the re-run imports them fully.
  const ps = await prisma.product.findMany({
    where: { status: 'draft', images: { some: {} } },
    select: { id: true, sku: true, name: true, _count: { select: { images: true } } },
  })
  console.log(`draft products WITH images: ${ps.length}`)
  for (const p of ps) {
    console.log(`${p.sku} | ${p._count.images} image(s) | ${p.name}`)
    if (CLEAN) {
      const del = await prisma.productImage.deleteMany({ where: { productId: p.id } })
      console.log(`  deleted ${del.count} partial image row(s)`)
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
