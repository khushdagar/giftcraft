import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serializeProduct } from '@/lib/serialize';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: params.slug, status: 'active' },
      include: {
        priceTiers: {
          orderBy: { tier: 'asc' },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
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
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Fetch related products (4 sharing a category)
    const relatedProducts = await prisma.product.findMany({
      where: {
        status: 'active',
        id: { not: product.id },
        categories: {
          some: {
            categoryId: {
              in: product.categories.map((pc) => pc.categoryId),
            },
          },
        },
      },
      include: {
        priceTiers: {
          where: { tier: 1 },
          take: 1,
        },
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      take: 4,
    });

    const serialized = serializeProduct(product);
    const serializedRelated = relatedProducts.map(serializeProduct);

    return NextResponse.json({
      product: serialized,
      related: serializedRelated,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}
