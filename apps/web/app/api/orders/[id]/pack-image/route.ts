import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canAccessOrder } from '@/lib/order-access';
import { ensureOrderPackImage } from '@/lib/pack-image-service';

export const dynamic = 'force-dynamic';
// Image generation routinely takes 15–40s.
export const maxDuration = 120;

/**
 * POST /api/orders/[id]/pack-image
 * Makes sure a placed order has its AI pack image before its proposal deck is
 * built. Owner or super_admin only, matching /api/orders/[id]/deck.
 *
 * Answers 200 with `url: null` when the image could not be produced — the deck
 * still downloads, just without the pack photo.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const order = await prisma.order.findUnique({ where: { id: params.id } });
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    if (!canAccessOrder(order, session.user)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const url = await ensureOrderPackImage(order.id, session.user.id);
    return NextResponse.json({ success: true, data: { url } });
  } catch (error) {
    console.error('Order pack image error:', error);
    return NextResponse.json({ success: true, data: { url: null } });
  }
}
