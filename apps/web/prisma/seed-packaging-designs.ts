/**
 * Seeds the three Gift Builder packaging designs as real products in the
 * "Packaging" category, each with Small/Medium/Large size variants that carry a
 * price — so a non-technical admin can edit them from the Products tab.
 *
 *   Magnetic Box     S ₹120 · M ₹180 · L ₹240
 *   Pizza Box        S ₹110 · M ₹160 · L ₹200
 *   Top Bottom Box   S ₹80  · M ₹140 · L ₹180
 *
 * Also archives any older packaging products (Standard White Box, Kraft Eco
 * Box, …) so they disappear from the builder while staying intact for history.
 *
 * Idempotent — safe to re-run. Variant prices are written via raw SQL so it runs
 * even before the Prisma client is regenerated for the new `price` column.
 *
 *   npx tsx prisma/seed-packaging-designs.ts
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

type Size = 'Small' | 'Medium' | 'Large';

const DESIGNS: Array<{
  name: string;
  slug: string;
  sku: string;
  description: string;
  prices: Record<Size, number>;
}> = [
  {
    name: 'Magnetic Box',
    slug: 'magnetic-box',
    sku: 'PKG-MAGNETIC',
    description: 'Rigid magnetic-closure premium box.',
    prices: { Small: 120, Medium: 180, Large: 240 },
  },
  {
    name: 'Pizza Box',
    slug: 'pizza-box',
    sku: 'PKG-PIZZA',
    description: 'Flip-open flat pizza-style box.',
    prices: { Small: 110, Medium: 160, Large: 200 },
  },
  {
    name: 'Top Bottom Box',
    slug: 'top-bottom-box',
    sku: 'PKG-TOPBOTTOM',
    description: 'Classic lid-and-base two-piece box.',
    prices: { Small: 80, Medium: 140, Large: 180 },
  },
];

const normalizeKey = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');
const PACKAGING_KEYS = ['packaging', 'packagings'];

async function main() {
  console.log('📦 Seeding packaging designs…');

  // 1. Find (or create) the "Packaging" category.
  const cats = await prisma.category.findMany({ select: { id: true, name: true, slug: true } });
  let category = cats.find(
    (c) =>
      PACKAGING_KEYS.includes(normalizeKey(c.name)) ||
      (c.slug ? PACKAGING_KEYS.includes(normalizeKey(c.slug)) : false)
  );
  if (!category) {
    category = await prisma.category.create({ data: { name: 'Packaging', slug: 'packaging' } });
    console.log('  · created "Packaging" category');
  }
  const categoryId = category.id;

  // 2. Upsert each design + its size variants.
  for (const d of DESIGNS) {
    const product = await prisma.product.upsert({
      where: { slug: d.slug },
      create: {
        name: d.name,
        slug: d.slug,
        sku: d.sku,
        descriptionShort: d.description,
        status: 'active',
        moq: 1,
      },
      update: { name: d.name, descriptionShort: d.description, status: 'active' },
    });

    // Category link
    await prisma.productCategory.upsert({
      where: { productId_categoryId: { productId: product.id, categoryId } },
      create: { productId: product.id, categoryId },
      update: {},
    });

    // Base price tier — the fallback price if a size has none (uses Medium).
    await prisma.priceTier.upsert({
      where: { productId_tier: { productId: product.id, tier: 1 } },
      create: {
        productId: product.id,
        tier: 1,
        minQty: 1,
        maxQty: null,
        costPrice: new Prisma.Decimal(0),
        sellPrice: new Prisma.Decimal(d.prices.Medium),
      },
      update: { sellPrice: new Prisma.Decimal(d.prices.Medium) },
    });

    // Size variants — reset then recreate so re-runs stay clean.
    await prisma.productVariant.deleteMany({ where: { productId: product.id, kind: 'size' } });
    await prisma.productVariant.createMany({
      data: [
        { productId: product.id, kind: 'size', value: 'Small', sortOrder: 0 },
        { productId: product.id, kind: 'size', value: 'Medium', sortOrder: 1 },
        { productId: product.id, kind: 'size', value: 'Large', sortOrder: 2 },
      ],
    });

    // Prices via raw SQL (works before the client is regenerated for `price`).
    for (const size of ['Small', 'Medium', 'Large'] as Size[]) {
      await prisma.$executeRaw`
        UPDATE "ProductVariant" SET "price" = ${d.prices[size]}
        WHERE "productId" = ${product.id} AND "kind" = 'size' AND "value" = ${size}`;
    }

    console.log(
      `  · ${d.name} — S ₹${d.prices.Small} / M ₹${d.prices.Medium} / L ₹${d.prices.Large}`
    );
  }

  // 3. Archive older packaging products so they leave the builder (kept for history).
  const archived = await prisma.product.updateMany({
    where: {
      categories: { some: { categoryId } },
      slug: { notIn: DESIGNS.map((d) => d.slug) },
      status: 'active',
    },
    data: { status: 'archived' },
  });
  if (archived.count > 0) {
    console.log(`  · archived ${archived.count} older packaging product(s)`);
  }

  console.log('✅ Packaging designs seeded.');
}

main()
  .catch((e) => {
    console.error('❌ Packaging seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
