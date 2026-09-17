/**
 * Adds more gift-builder options, each with Small / Medium / Large prices:
 *
 *   · new BOX designs in the "Packaging" category (MDF box, kraft box, …)
 *   · FILLERS & LININGS in the "Add-on" category (crinkle paper, foam insert,
 *     satin lining, …) — size-priced add-ons follow the pack's auto box size.
 *
 * Purely ADDITIVE: a product whose slug already exists is left completely
 * alone (no price overwrite), and nothing is ever archived — unlike
 * prisma/seed-packaging-designs.ts, which must NOT be re-run on live data.
 * Prices are indicative Indian bulk-market sell prices (Sept 2026); edit them
 * afterwards in Admin → Products → Variants.
 *
 * Usage (from apps/web):
 *   npx tsx scripts/add-packaging-options.ts            # dry run
 *   npx tsx scripts/add-packaging-options.ts --apply    # create the products
 */

import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

type Size = 'Small' | 'Medium' | 'Large';
const SIZES: Size[] = ['Small', 'Medium', 'Large'];

interface Option {
  name: string;
  slug: string;
  sku: string;
  description: string;
  prices: Record<Size, number>;
}

const BOXES: Option[] = [
  {
    name: 'MDF Box',
    slug: 'mdf-box',
    sku: 'PKG-MDF',
    description: 'Sturdy MDF wooden box with a hinged lid — a premium keepsake finish.',
    prices: { Small: 280, Medium: 360, Large: 450 },
  },
  {
    name: 'Kraft Box',
    slug: 'kraft-box',
    sku: 'PKG-KRAFT',
    description: 'Eco-friendly brown kraft box, recyclable and print-ready.',
    prices: { Small: 50, Medium: 70, Large: 100 },
  },
  {
    name: 'Wooden Crate',
    slug: 'wooden-crate',
    sku: 'PKG-CRATE',
    description: 'Open pine-wood crate for a rustic, hamper-style presentation.',
    prices: { Small: 320, Medium: 420, Large: 540 },
  },
  {
    name: 'Hamper Basket',
    slug: 'hamper-basket',
    sku: 'PKG-BASKET',
    description: 'Hand-woven cane basket — the classic festive hamper look.',
    prices: { Small: 220, Medium: 300, Large: 400 },
  },
  {
    name: 'Tin Box',
    slug: 'tin-box',
    sku: 'PKG-TIN',
    description: 'Reusable metal tin box with a snug lid.',
    prices: { Small: 150, Medium: 200, Large: 260 },
  },
  {
    name: 'Jute Gift Bag',
    slug: 'jute-gift-bag',
    sku: 'PKG-JUTE',
    description: 'Natural jute bag with handles — a reusable, sustainable alternative to a box.',
    prices: { Small: 90, Medium: 120, Large: 160 },
  },
];

const FILLERS: Option[] = [
  {
    name: 'Crinkle Paper Fill',
    slug: 'crinkle-paper-fill',
    sku: 'ADD-CRINKLE',
    description: 'Shredded crinkle paper that cushions products and fills the box.',
    prices: { Small: 15, Medium: 25, Large: 40 },
  },
  {
    name: 'Foam Insert',
    slug: 'foam-insert',
    sku: 'ADD-FOAM',
    description: 'Die-cut foam insert that holds every product snugly in place.',
    prices: { Small: 60, Medium: 90, Large: 130 },
  },
  {
    name: 'Satin Lining',
    slug: 'satin-lining',
    sku: 'ADD-SATIN',
    description: 'Soft satin cloth lining for a luxe unboxing.',
    prices: { Small: 50, Medium: 75, Large: 110 },
  },
  {
    name: 'Wood Wool Fill',
    slug: 'wood-wool-fill',
    sku: 'ADD-WOODWOOL',
    description: 'Natural wood-wool shavings — a rustic, eco-friendly filler.',
    prices: { Small: 20, Medium: 30, Large: 45 },
  },
  {
    name: 'Tissue Paper Wrap',
    slug: 'tissue-paper-wrap',
    sku: 'ADD-TISSUE',
    description: 'Tissue paper wrap around the products inside the box.',
    prices: { Small: 10, Medium: 15, Large: 20 },
  },
];

const normalize = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');

async function categoryId(keys: string[], label: string): Promise<string> {
  const cats = await prisma.category.findMany({ select: { id: true, name: true, slug: true } });
  const hit = cats.find((c) => keys.includes(normalize(c.name)) || keys.includes(normalize(c.slug)));
  if (!hit) throw new Error(`No "${label}" category found — create it in the admin first`);
  return hit.id;
}

async function addOptions(label: string, catId: string, options: Option[]) {
  console.log(`\n${label}`);
  for (const o of options) {
    const existing = await prisma.product.findFirst({
      where: { OR: [{ slug: o.slug }, { sku: o.sku }] },
      select: { id: true, status: true },
    });
    const line = `S ₹${o.prices.Small} / M ₹${o.prices.Medium} / L ₹${o.prices.Large}`;
    if (existing) {
      console.log(`  = ${o.name}: already exists (${existing.status}), left untouched`);
      continue;
    }
    console.log(`  + ${o.name} — ${line}`);
    if (!APPLY) continue;

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: o.name,
          slug: o.slug,
          sku: o.sku,
          descriptionShort: o.description,
          status: 'active',
          moq: 1,
        },
      });
      await tx.productCategory.create({ data: { productId: product.id, categoryId: catId } });
      // Base tier = the fallback price when a size has none (Medium, like the seed).
      await tx.priceTier.create({
        data: {
          productId: product.id,
          tier: 1,
          minQty: 1,
          maxQty: null,
          costPrice: new Prisma.Decimal(0),
          sellPrice: new Prisma.Decimal(o.prices.Medium),
        },
      });
      await tx.productVariant.createMany({
        data: SIZES.map((size, i) => ({
          productId: product.id,
          kind: 'size',
          value: size,
          sortOrder: i,
          price: new Prisma.Decimal(o.prices[size]),
        })),
      });
      await tx.priceAuditLog.create({
        data: {
          productId: product.id,
          tier: 1,
          newSell: new Prisma.Decimal(o.prices.Medium),
          changedBy: 'script:add-packaging-options',
          reason: `Initial price (${line})`,
        },
      });
    });
  }
}

async function main() {
  console.log(APPLY ? 'APPLYING' : 'DRY RUN — nothing is written');
  const packagingId = await categoryId(['packaging', 'packagings'], 'Packaging');
  const addonId = await categoryId(['addon', 'addons'], 'Add-on');

  // What is live today, for context.
  for (const [label, id] of [['Packaging', packagingId], ['Add-on', addonId]] as const) {
    const current = await prisma.product.findMany({
      where: { status: 'active', categories: { some: { categoryId: id } } },
      select: { name: true, priceTiers: { where: { tier: 1 }, select: { sellPrice: true } } },
      orderBy: { name: 'asc' },
    });
    console.log(
      `Current ${label}: ${current.map((p) => `${p.name} (₹${p.priceTiers[0]?.sellPrice ?? '-'})`).join(', ') || 'none'}`
    );
  }

  await addOptions('Boxes → Packaging', packagingId, BOXES);
  await addOptions('Fillers & linings → Add-on', addonId, FILLERS);
  if (!APPLY) console.log('\nRe-run with --apply to create them.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
