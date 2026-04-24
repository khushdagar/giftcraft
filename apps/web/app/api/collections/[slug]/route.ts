import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/collections/[slug]
 * Returns a single collection with all its products
 * Public access (no auth required)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const collection = await prisma.collection.findUnique({
      where: { slug: params.slug },
      include: {
        products: {
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: 'asc' }, take: 3 },
                priceTiers: { orderBy: { tier: 'asc' }, take: 1 },
                categories: { select: { categoryId: true } },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    if (!collection.isActive) {
      return NextResponse.json(
        { error: 'Collection not available' },
        { status: 404 }
      );
    }

    // Format response
    const formattedCollection = {
      id: collection.slug,
      name: collection.name,
      description: collection.description,
      heroImage: collection.heroImage,
      sortOrder: collection.sortOrder,
      products: collection.products.map((cp) => ({
        id: cp.product.slug,
        name: cp.product.name,
        brand: cp.product.brand,
        images: cp.product.images,
        price: Number(cp.product.priceTiers[0]?.sellPrice) || 0,
        categories: cp.product.categories,
      })),
    };

    return NextResponse.json(formattedCollection);
  } catch (error) {
    console.error('Error fetching collection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collection' },
      { status: 500 }
    );
  }
}
