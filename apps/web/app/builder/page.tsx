import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { BuilderLayout } from '@/components/builder/builder-layout';
import { BuilderContent } from '@/components/builder/builder-content';

export const metadata: Metadata = {
  title: 'Gift Builder — GiftCraft',
  description: 'Create your custom branded gift pack',
};

export default async function BuilderPage() {
  // Fetch all data in parallel
  const [products, categories, packaging, addons] = await Promise.all([
    prisma.product.findMany({
      where: { status: 'active' },
      include: {
        priceTiers: { orderBy: { tier: 'asc' } },
        images: { orderBy: { sortOrder: 'asc' } },
        categories: { select: { categoryId: true } },
        hsn: { select: { hsnCode: true, gstRate: true } },
      },
    }),
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.packaging.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.addon.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  // Serialize products for client components
  const serializedProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    brand: p.brand,
    printingTechnique: p.printingTechnique,
    leadTimeDays: p.leadTimeDays,
    hsnCode: p.hsn?.hsnCode,
    gstRate: p.hsn?.gstRate ? Number(p.hsn.gstRate) : undefined,
    priceTiers: p.priceTiers.map((pt) => ({
      tier: pt.tier,
      minQty: pt.minQty,
      maxQty: pt.maxQty,
      sellPrice: Number(pt.sellPrice),
    })),
    images: p.images,
    categories: p.categories,
  }));

  // Serialize packaging and addons
  const serializedPackaging = packaging.map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    price: Number(pkg.price),
  }));

  const serializedAddons = addons.map((addon) => ({
    id: addon.id,
    name: addon.name,
    price: Number(addon.price),
  }));

  return (
    <BuilderLayout>
      <BuilderContent
        allProducts={serializedProducts}
        categories={categories}
        packagingOptions={serializedPackaging}
        addonOptions={serializedAddons}
      />
    </BuilderLayout>
  );
}
