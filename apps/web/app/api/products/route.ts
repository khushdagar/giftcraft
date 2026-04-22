import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { serializeProduct } from '@/lib/serialize';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

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
          priceTiers: {
            where: { tier: 1 },
            take: 1,
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
