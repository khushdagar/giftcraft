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

async function main() {
  const ps = await prisma.product.findMany({
    where: { images: { none: {} } },
    select: { sku: true, name: true, status: true },
  })
  console.log(`Products with NO images: ${ps.length}`)
  for (const p of ps.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`${p.sku} | ${p.status} | ${p.name}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
