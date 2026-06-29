/**
 * Backfill packaging dimensions.
 *
 * The builder's packaging selector (/api/packaging) is sourced from PRODUCTS in
 * the "Packaging" category, and the box auto-suggestion needs each box's real
 * L×W×H. Imported packaging products usually have no dimensions, so the
 * suggestion can't work. This sets sensible dimensions on any packaging product
 * that's missing them:
 *   1. Parse "L x W x H" straight out of the product name when present.
 *   2. Otherwise use a keyword default (sleeve / premium / standard box).
 *
 * Existing non-zero dimensions are left untouched (admin edits win).
 *
 *   npm run db:backfill-packaging-dims
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// L×W×H (cm) keyword defaults for boxes without a size in their name.
const SLEEVE = { l: 30, w: 24, h: 2 };
const PREMIUM = { l: 35, w: 28, h: 15 };
const STANDARD = { l: 28, w: 22, h: 12 };

function dimsFromName(name: string): { l: number; w: number; h: number } | null {
  const m = name.match(
    /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i
  );
  if (m) return { l: parseFloat(m[1]!), w: parseFloat(m[2]!), h: parseFloat(m[3]!) };

  const n = name.toLowerCase();
  if (n.includes('sleeve')) return SLEEVE;
  if (/(rigid|magnetic|premium|luxe|trunk|wooden|hamper)/.test(n)) return PREMIUM;
  if (/(box|kraft|white|standard|corrugated|mailer)/.test(n)) return STANDARD;
  return STANDARD; // safe default for any other packaging item
}

async function main() {
  console.log('📦 Backfilling packaging dimensions…');

  const cats = await prisma.category.findMany({
    where: {
      OR: [
        { name: { contains: 'packaging', mode: 'insensitive' } },
        { slug: { contains: 'packaging' } },
      ],
    },
    select: { id: true },
  });
  const catIds = cats.map((c) => c.id);
  if (catIds.length === 0) {
    console.log('   ⚠ No "Packaging" category found — nothing to do.');
    return;
  }

  const products = await prisma.product.findMany({
    where: { categories: { some: { categoryId: { in: catIds } } } },
    select: { id: true, name: true, dimensionL: true, dimensionW: true, dimensionH: true },
  });

  let updated = 0;
  for (const p of products) {
    const hasDims =
      (p.dimensionL ?? 0) > 0 && (p.dimensionW ?? 0) > 0 && (p.dimensionH ?? 0) > 0;
    if (hasDims) continue; // respect existing/admin-set dimensions

    const dims = dimsFromName(p.name);
    if (!dims) continue;

    await prisma.product.update({
      where: { id: p.id },
      data: { dimensionL: dims.l, dimensionW: dims.w, dimensionH: dims.h },
    });
    console.log(`   ✓ ${p.name} → ${dims.l}×${dims.w}×${dims.h} cm`);
    updated++;
  }

  console.log(`✅ Done. Set dimensions on ${updated}/${products.length} packaging products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
