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
      return NextResponse.json({ products: [], categories: [] });
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

    const [products, categories] = await Promise.all([
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
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
        take: 8,
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
      categories,
    });
  } catch (error) {
    console.error('Error building search suggestions:', error);
    return NextResponse.json({ products: [], categories: [] }, { status: 200 });
  }
}
