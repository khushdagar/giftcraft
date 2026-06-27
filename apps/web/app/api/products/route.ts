import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { serializeProduct } from '@/lib/serialize';
import { getHiddenCategoryIds } from '@/lib/catalog-visibility';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url || 'http://localhost:3000');
    const { searchParams } = url;

    const search = searchParams.get('search') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;
    const occasionId = searchParams.get('occasionId') || undefined;
    const brand = searchParams.get('brand') || undefined;
    const eco = searchParams.get('eco') === 'true';
    const hasBranding = searchParams.get('hasBranding') === 'true';
    const priceMin = searchParams.get('priceMin') ? Number(searchParams.get('priceMin')) : undefined;
    const priceMax = searchParams.get('priceMax') ? Number(searchParams.get('priceMax')) : undefined;
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const limit = Math.min(100, Number(searchParams.get('limit') || '24'));
    const sort = searchParams.get('sort') || 'featured';

    // Packaging/add-on products are managed in their own tables and must never
    // surface in the customer catalog — exclude any product in those categories.
    const hiddenCategoryIds = await getHiddenCategoryIds();

    // Build where clause
    const where: Prisma.ProductWhereInput = {
      status: 'active',
      // Combined via AND so it never collides with the `categories` (some) filter below.
      ...(hiddenCategoryIds.length > 0 && {
        AND: [{ categories: { none: { categoryId: { in: hiddenCategoryIds } } } }],
      }),
      ...(search && {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      }),
      ...(categoryId && {
        categories: {
          some: {
            categoryId,
          },
        },
      }),
      ...(occasionId && {
        occasions: {
          some: {
            occasionId,
          },
        },
      }),
      ...(brand && { brand }),
      ...(eco && { isEcoCertified: true }),
      ...(hasBranding && { printingTechnique: { not: 'none' } }),
      ...(priceMin || priceMax) && {
        priceTiers: {
          some: {
            tier: 1,
            ...(priceMin && {
              sellPrice: {
                gte: new Prisma.Decimal(priceMin),
              },
            }),
            ...(priceMax && {
              sellPrice: {
                lte: new Prisma.Decimal(priceMax),
              },
            }),
          },
        },
      },
    };

    // Build orderBy - note: price sorting done client-side
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === 'newest') orderBy = { createdAt: 'desc' };
    if (sort === 'featured') orderBy = { isFeatured: 'desc' };

    // Fetch products and total count in parallel
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          // Return ALL tiers (ordered) so the builder can re-price by quantity.
          // The catalog card still uses priceTiers[0] (tier 1) for the "from" price.
          priceTiers: {
            orderBy: { tier: 'asc' },
          },
          images: {
            where: { isPrimary: true },
            take: 1,
          },
          hsn: {
            include: {
              hsn: true,
            },
          },
          categories: {
            include: {
              category: true,
            },
          },
          occasions: {
            include: {
              occasion: true,
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // Serialize products
    const serialized = products.map(serializeProduct);

    return NextResponse.json({
      products: serialized,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
