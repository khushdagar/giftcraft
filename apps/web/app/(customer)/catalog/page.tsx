import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { serializeProduct } from '@/lib/serialize';
import { CatalogContent } from '@/components/catalog/catalog-content';

export const revalidate = 60; // ISR: revalidate every 60 seconds

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  // Parse search params
  const search = typeof searchParams.search === 'string' ? searchParams.search : undefined;
  const categoryId = typeof searchParams.categoryId === 'string' ? searchParams.categoryId : undefined;
  const occasionId = typeof searchParams.occasionId === 'string' ? searchParams.occasionId : undefined;
  const brand = typeof searchParams.brand === 'string' ? searchParams.brand : undefined;
  const eco = searchParams.eco === '1';
  const hasBranding = searchParams.hasBranding === '1';
  const priceMin = searchParams.priceMin ? Number(searchParams.priceMin) : undefined;
  const priceMax = searchParams.priceMax ? Number(searchParams.priceMax) : undefined;
  const page = Math.max(1, Number(searchParams.page || '1'));
  const limit = 24;
  const sort = (typeof searchParams.sort === 'string' ? searchParams.sort : 'featured') || 'featured';

  // Build where clause
  const where: Prisma.ProductWhereInput = {
    status: 'active',
    ...(search && {
      name: {
        contains: search,
        mode: 'insensitive',
      },
    }),
    ...(categoryId && {
      categories: {
        some: { categoryId },
      },
    }),
    ...(occasionId && {
      occasions: {
        some: { occasionId },
      },
    }),
    ...(brand && { brand }),
    ...(eco && { isEcoCertified: true }),
    ...(hasBranding && { printingTechnique: { not: 'none' } }),
    ...(priceMin || priceMax) && {
      priceTiers: {
        some: {
          tier: 1,
          ...(priceMin && { sellPrice: { gte: new Prisma.Decimal(priceMin) } }),
          ...(priceMax && { sellPrice: { lte: new Prisma.Decimal(priceMax) } }),
        },
      },
    },
  };

  // Build orderBy - note: price sorting is done client-side for simplicity
  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
  if (sort === 'newest') orderBy = { createdAt: 'desc' };
  if (sort === 'featured') orderBy = { isFeatured: 'desc' };
  // Price sorting handled client-side in catalog-content component

  // Fetch data in parallel
  const [products, total, filterData] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        priceTiers: { where: { tier: 1 }, take: 1 },
        images: { where: { isPrimary: true }, take: 1 },
        hsn: { include: { hsn: true } },
        categories: { include: { category: true } },
        occasions: { include: { occasion: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
    Promise.all([
      prisma.category.findMany({
        where: { parentId: null },
        include: {
          children: {
            include: { children: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.occasionConfig.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.product.findMany({
        where: { status: 'active', brand: { not: null } },
        select: { brand: true },
        distinct: ['brand'],
        orderBy: { brand: 'asc' },
      }),
      prisma.priceTier.aggregate({
        where: { tier: 1 },
        _min: { sellPrice: true },
        _max: { sellPrice: true },
      }),
    ]),
  ]);

  const [categories, occasions, brandData, priceRange] = filterData;
  const brands = brandData.map((b) => b.brand).filter(Boolean) as string[];
  const minPrice = priceRange._min.sellPrice ? Number(priceRange._min.sellPrice) : 0;
  const maxPrice = priceRange._max.sellPrice ? Number(priceRange._max.sellPrice) : 10000;

  const serializedProducts = products.map(serializeProduct);

  return (
    <CatalogContent
      products={serializedProducts}
      total={total}
      page={page}
      limit={limit}
      categories={categories}
      occasions={occasions}
      brands={brands}
      minPrice={minPrice}
      maxPrice={maxPrice}
      currentFilters={{
        search,
        categoryId,
        occasionId,
        brand,
        eco,
        hasBranding,
        priceMin,
        priceMax,
        sort,
      }}
    />
  );
}
