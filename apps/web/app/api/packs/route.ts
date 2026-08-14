import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Curated packs with their member products, shaped like /api/products entries
 * so callers (admin proposal builder) can reuse the same product mapping.
 */
export async function GET() {
  try {
    const packs = await prisma.product.findMany({
      where: { status: 'active', isPack: true },
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
                id: true,
                name: true,
                brand: true,
                images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
                priceTiers: {
                  orderBy: { minQty: 'asc' },
                  select: { minQty: true, maxQty: true, sellPrice: true },
                },
              },
            },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { viewCount: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(
      packs.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        image: p.images[0]?.url ?? null,
        items: p.packItems.map((it) => ({
          id: it.product.id,
          name: it.product.name,
          brand: it.product.brand,
          images: it.product.images,
          priceTiers: it.product.priceTiers.map((t) => ({
            minQty: t.minQty,
            maxQty: t.maxQty,
            sellPrice: Number(t.sellPrice),
          })),
        })),
      }))
    );
  } catch (error) {
    console.error('Error fetching packs:', error);
    return NextResponse.json([], { status: 200 });
  }
}
