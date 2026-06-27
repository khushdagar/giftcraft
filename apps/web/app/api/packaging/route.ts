import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getPackagingCategoryIds } from '@/lib/catalog-visibility';

export async function GET() {
  try {
    const categoryIds = await getPackagingCategoryIds();
    if (categoryIds.length === 0) {
      return NextResponse.json([]);
    }

    // Packaging options are Products in the "Packaging" category (managed in the
    // normal product admin), mapped to the packaging shape the builder expects.
    const products = await prisma.product.findMany({
      where: {
        status: 'active',
        categories: { some: { categoryId: { in: categoryIds } } },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        descriptionShort: true,
        dimensionL: true,
        dimensionW: true,
        dimensionH: true,
        priceTiers: { orderBy: { tier: 'asc' }, take: 1, select: { sellPrice: true } },
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(
      products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: Number(p.priceTiers[0]?.sellPrice ?? 0),
        description: p.descriptionShort ?? '',
        imageUrl: p.images[0]?.url ?? null,
        lengthCm: p.dimensionL,
        widthCm: p.dimensionW,
        heightCm: p.dimensionH,
        isActive: true,
      }))
    );
  } catch (error) {
    console.error('Error fetching packaging:', error);
    return NextResponse.json({ error: 'Failed to fetch packaging' }, { status: 500 });
  }
}
