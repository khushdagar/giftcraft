import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isHiddenCategory, getHiddenCategoryIds } from '@/lib/catalog-visibility';

export async function GET() {
  try {
    // Packaging/add-on products are excluded everywhere in the catalog filters.
    const hiddenCategoryIds = await getHiddenCategoryIds();
    const notHidden =
      hiddenCategoryIds.length > 0
        ? { categories: { none: { categoryId: { in: hiddenCategoryIds } } } }
        : {};

    // Fetch all filter data in parallel
    const [categoriesRaw, occasions, brandData, priceRange] = await Promise.all([
      // Categories: L1 tree with L2 and L3 children
      prisma.category.findMany({
        where: { parentId: null },
        include: {
          children: {
            include: {
              children: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      }),

      // Occasions
      prisma.occasionConfig.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),

      // Brands (distinct from active, catalog-visible products)
      prisma.product.findMany({
        where: {
          status: 'active',
          brand: { not: null },
          ...notHidden,
        },
        select: { brand: true },
        distinct: ['brand'],
        orderBy: { brand: 'asc' },
      }),

      // Price range (min and max from tier 1 of catalog-visible products)
      prisma.priceTier.aggregate({
        where: { tier: 1, product: notHidden },
        _min: { sellPrice: true },
        _max: { sellPrice: true },
      }),
    ]);

    // Hide the packaging/add-on categories from the filter bar (top-level or nested).
    const categories = categoriesRaw.filter((cat) => !isHiddenCategory(cat));

    const brands = brandData.map((b) => b.brand).filter(Boolean) as string[];
    const minPrice = priceRange._min.sellPrice
      ? Number(priceRange._min.sellPrice)
      : 0;
    const maxPrice = priceRange._max.sellPrice
      ? Number(priceRange._max.sellPrice)
      : 10000;

    return NextResponse.json({
      categories,
      occasions,
      brands,
      minPrice,
      maxPrice,
    });
  } catch (error) {
    console.error('Error fetching catalog filters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filters' },
      { status: 500 }
    );
  }
}
