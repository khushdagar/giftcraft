/**
 * One-off: raise every Packaging-category product (the gift-builder boxes) by a
 * percentage. Touches the tier sell prices (PriceTier.sellPrice) and the
 * per-size variant prices (ProductVariant.price for kind='size'); cost prices
 * are untouched. Every change is written to PriceAuditLog with a fixed reason
 * tag, and products already carrying that tag are skipped, so re-running the
 * script never compounds the increase.
 *
 * Usage (from apps/web):
 *   npx tsx scripts/raise-packaging-prices.ts            # dry run — prints the plan
 *   npx tsx scripts/raise-packaging-prices.ts --apply    # writes the changes
 *   PCT=15 npx tsx scripts/raise-packaging-prices.ts --apply   # other percentage
 */

import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const PCT = Number(process.env.PCT || '20');
const APPLY = process.argv.includes('--apply');
const CHANGED_BY = process.env.CHANGED_BY || 'script:raise-packaging-prices';
const REASON = `packaging-bulk-increase-${PCT}pct-2026-09`;

const PACKAGING_KEYS = new Set(['packaging', 'packagings']);
const normalize = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');

function raise(value: Prisma.Decimal): Prisma.Decimal {
  // Round to the nearest rupee — box prices are whole-rupee figures.
  return new Prisma.Decimal(value).mul(100 + PCT).div(100).toDecimalPlaces(0);
}

async function main() {
  if (!Number.isFinite(PCT) || PCT <= 0) throw new Error(`Bad PCT "${process.env.PCT}"`);

  const cats = await prisma.category.findMany({ select: { id: true, name: true, slug: true } });
  const packagingIds = cats
    .filter((c) => PACKAGING_KEYS.has(normalize(c.name)) || PACKAGING_KEYS.has(normalize(c.slug)))
    .map((c) => c.id);
  if (packagingIds.length === 0) throw new Error('No Packaging category found');

  const products = await prisma.product.findMany({
    where: {
      status: { not: 'archived' },
      categories: { some: { categoryId: { in: packagingIds } } },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      priceTiers: { orderBy: { tier: 'asc' }, select: { id: true, tier: true, sellPrice: true } },
      variants: {
        where: { kind: 'size', price: { not: null } },
        select: { id: true, value: true, price: true },
      },
      auditLogs: { where: { reason: { startsWith: REASON } }, select: { id: true }, take: 1 },
    },
    orderBy: { name: 'asc' },
  });

  console.log(`${APPLY ? 'APPLYING' : 'DRY RUN'} +${PCT}% on ${products.length} packaging product(s)\n`);

  let touched = 0;
  for (const p of products) {
    if (p.auditLogs.length > 0) {
      console.log(`- ${p.name} [${p.slug}]: already raised (audit tag found), skipping`);
      continue;
    }
    const tierPlan = p.priceTiers.map((t) => ({ ...t, next: raise(t.sellPrice) }));
    const variantPlan = p.variants.map((v) => ({ ...v, next: raise(v.price!) }));
    if (tierPlan.length === 0 && variantPlan.length === 0) {
      console.log(`- ${p.name} [${p.slug}]: no prices, skipping`);
      continue;
    }

    console.log(`- ${p.name} [${p.slug}]`);
    for (const t of tierPlan) console.log(`    tier ${t.tier}: ${t.sellPrice} -> ${t.next}`);
    for (const v of variantPlan) console.log(`    size ${v.value}: ${v.price} -> ${v.next}`);
    touched++;

    if (!APPLY) continue;

    await prisma.$transaction([
      ...tierPlan.map((t) =>
        prisma.priceTier.update({ where: { id: t.id }, data: { sellPrice: t.next } })
      ),
      ...variantPlan.map((v) =>
        prisma.productVariant.update({ where: { id: v.id }, data: { price: v.next } })
      ),
      ...tierPlan.map((t) =>
        prisma.priceAuditLog.create({
          data: {
            productId: p.id,
            tier: t.tier,
            oldSell: t.sellPrice,
            newSell: t.next,
            changedBy: CHANGED_BY,
            reason: REASON,
          },
        })
      ),
      // Size-variant prices have no tier; logged as tier 0 with the size in the reason.
      ...variantPlan.map((v) =>
        prisma.priceAuditLog.create({
          data: {
            productId: p.id,
            tier: 0,
            oldSell: v.price,
            newSell: v.next,
            changedBy: CHANGED_BY,
            reason: `${REASON} (size ${v.value})`,
          },
        })
      ),
    ]);
  }

  console.log(`\n${APPLY ? 'Updated' : 'Would update'} ${touched} product(s).`);
  if (!APPLY) console.log('Re-run with --apply to write the changes.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
