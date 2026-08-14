import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getHiddenCategoryIds } from '@/lib/catalog-visibility';

export const dynamic = 'force-dynamic';

/**
 * Typeahead for the navbar search box. Deliberately light: a handful of product
 * hits plus matching categories, no price tiers or relations beyond the primary
 * image. The full result set lives at /catalog?search=.
 */
export async function GET(request: NextRequest) {
  try {
    const q = (new URL(request.url).searchParams.get('q') || '').trim();
    if (q.length < 2) {
      return NextResponse.json({ products: [], packs: [], categories: [] });
    }

    const hiddenCategoryIds = await getHiddenCategoryIds();
    // Each word must match somewhere, so "eco bottle" narrows instead of widening.
    const words = q.split(/\s+/).filter(Boolean).slice(0, 5);
    const wordMatch = (word: string): Prisma.ProductWhereInput => ({
      OR: [
        { name: { contains: word, mode: 'insensitive' } },
        { brand: { contains: word, mode: 'insensitive' } },
        { sku: { contains: word, mode: 'insensitive' } },
        { material: { contains: word, mode: 'insensitive' } },
        { descriptionShort: { contains: word, mode: 'insensitive' } },
        { tags: { has: word.toLowerCase() } },
        { categories: { some: { category: { name: { contains: word, mode: 'insensitive' } } } } },
      ],
    });

    const [products, packs, categories] = await Promise.all([
      prisma.product.findMany({
        where: {
          status: 'active',
          isPack: false,
          AND: [
            ...(hiddenCategoryIds.length > 0
              ? [{ categories: { none: { categoryId: { in: hiddenCategoryIds } } } }]
              : []),
            ...words.map(wordMatch),
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          brand: true,
          images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
          priceTiers: { orderBy: { tier: 'asc' }, take: 1, select: { sellPrice: true } },
        },
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { viewCount: 'desc' }],
        take: 8,
      }),
      // Curated packs match on the same words. Price is the "From ₹x /pack"
      // figure: each member's cheapest (highest-quantity) tier, summed.
      prisma.product.findMany({
        where: {
          status: 'active',
          isPack: true,
          AND: words.map(wordMatch),
        },
        select: {
          id: true,
          name: true,
          slug: true,
          images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
          packItems: {
            orderBy: { sortOrder: 'asc' },
            select: {
              product: {
                select: {
                  images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
                  priceTiers: {
                    orderBy: { minQty: 'desc' },
                    take: 1,
                    select: { sellPrice: true },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { viewCount: 'desc' }],
        take: 4,
      }),
      prisma.category.findMany({
        where: {
          name: { contains: q, mode: 'insensitive' },
          ...(hiddenCategoryIds.length > 0 && { id: { notIn: hiddenCategoryIds } }),
        },
        select: { id: true, name: true, slug: true },
        take: 4,
      }),
    ]);

    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand,
        image: p.images[0]?.url ?? null,
        price: p.priceTiers[0] ? Number(p.priceTiers[0].sellPrice) : null,
      })),
      packs: packs.map((p) => {
        const price = p.packItems.reduce(
          (sum, it) => sum + (it.product.priceTiers[0] ? Number(it.product.priceTiers[0].sellPrice) : 0),
          0
        );
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          // Packs often have no image of their own — fall back to the first
          // member product's image, same as the pack listing pages.
          image:
            p.images[0]?.url ??
            p.packItems.find((it) => it.product.images[0])?.product.images[0]?.url ??
            null,
          price: price > 0 ? price : null,
        };
      }),
      categories,
    });
  } catch (error) {
    console.error('Error building search suggestions:', error);
    return NextResponse.json({ products: [], packs: [], categories: [] }, { status: 200 });
  }
}
