import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getAddonCategoryIds } from '@/lib/catalog-visibility';

// Route handlers with no request-dependent input are statically rendered at
// build time in Next 14 — that froze admin price/dimension edits (and newly
// added boxes) until the next deploy. Always read live from the DB.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categoryIds = await getAddonCategoryIds();
    if (categoryIds.length === 0) {
      return NextResponse.json([]);
    }

    // Add-ons are Products in the "Add-on" category (managed in the normal
    // product admin), mapped to the addon shape the builder/product page expect.
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
    console.error('Error fetching addons:', error);
    return NextResponse.json({ error: 'Failed to fetch addons' }, { status: 500 });
  }
}
