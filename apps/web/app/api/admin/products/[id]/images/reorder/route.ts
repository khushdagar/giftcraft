import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/admin/products/[id]/images/reorder
 * Persist a new image order. Body: { orderedIds: string[] }.
 *
 * The first id in the list becomes both sortOrder 0 AND the primary image
 * (Shopify-style: the cover is whatever sits first), so dragging an image to
 * the front is how you make it the cover.
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const orderedIds: unknown = body.orderedIds;
    if (!Array.isArray(orderedIds) || orderedIds.some((x) => typeof x !== 'string')) {
      return NextResponse.json({ error: 'orderedIds (string[]) required' }, { status: 400 });
    }

    // Only reorder images that actually belong to this product.
    const owned = await prisma.productImage.findMany({
      where: { productId: params.id },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((i) => i.id));
    const ids = (orderedIds as string[]).filter((id) => ownedIds.has(id));

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No matching images to reorder' }, { status: 400 });
    }

    await prisma.$transaction([
      ...ids.map((id, index) =>
        prisma.productImage.update({
          where: { id },
          data: { sortOrder: index, isPrimary: index === 0 },
        })
      ),
      // Any image not included in the list keeps its row but must not stay primary.
      prisma.productImage.updateMany({
        where: { productId: params.id, id: { notIn: ids } },
        data: { isPrimary: false },
      }),
    ]);

    const images = await prisma.productImage.findMany({
      where: { productId: params.id },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ success: true, images });
  } catch (error) {
    console.error('Error reordering images:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reorder images' },
      { status: 500 }
    );
  }
}
