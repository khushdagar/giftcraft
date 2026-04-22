import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Fetch all filter data in parallel
    const [categories, occasions, brandData, priceRange] = await Promise.all([
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

      // Brands (distinct from active products)
      prisma.product.findMany({
        where: {
          status: 'active',
          brand: { not: null },
        },
        select: { brand: true },
        distinct: ['brand'],
        orderBy: { brand: 'asc' },
      }),

      // Price range (min and max from tier 1)
      prisma.priceTier.aggregate({
        where: { tier: 1 },
        _min: { sellPrice: true },
        _max: { sellPrice: true },
      }),
    ]);

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
