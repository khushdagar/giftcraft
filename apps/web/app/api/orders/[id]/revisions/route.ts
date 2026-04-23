import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { MAX_FREE_REVISIONS, REVISION_FEE_PERCENT } from '@/lib/constants';
import { Decimal } from '@prisma/client/runtime/library';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: orderId } = params;
    const body = await request.json();
    const { revisionNotes, paymentId } = body;

    if (!revisionNotes) {
      return NextResponse.json(
        { error: 'Revision notes are required' },
        { status: 400 }
      );
    }

    // Verify order belongs to user
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { placedById: true, status: true, grandTotal: true, revisionCount: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.placedById !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (order.status !== 'mockup_pending') {
      return NextResponse.json(
        { error: 'Order is not awaiting mockup approval' },
        { status: 400 }
      );
    }

    const isExtraRevision = order.revisionCount >= MAX_FREE_REVISIONS;
    const revisionFeeAmount = isExtraRevision
      ? new Decimal(order.grandTotal).times(REVISION_FEE_PERCENT).dividedBy(100)
      : 0;

    // If extra revision, require payment
    if (isExtraRevision && !paymentId) {
      return NextResponse.json(
        {
          error: 'Payment required for additional revision',
          revisionFeeAmount: Number(revisionFeeAmount),
          message: `You have used ${MAX_FREE_REVISIONS} free revisions. Additional revisions cost ${REVISION_FEE_PERCENT}% of order amount.`,
        },
        { status: 402 }
      );
    }

    // Update order: increment revisionCount
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        revisionCount: { increment: 1 },
        // Status stays mockup_pending while awaiting new mockup
      },
      select: { id: true, revisionCount: true, status: true },
    });

    // Create timeline entry
    await prisma.orderTimeline.create({
      data: {
        orderId: orderId,
        status: 'mockup_pending',
        note: `Revision requested (${updated.revisionCount}/${MAX_FREE_REVISIONS + 1}). ${isExtraRevision ? 'Additional revision fee charged.' : 'Free revision.'}. Notes: ${revisionNotes}`,
        actorId: session.user.id,
      },
    });

    return NextResponse.json(
      {
        message: 'Revision request submitted. Design team will send updated mockups within 24 hours.',
        order: updated,
        revisionFeeCharged: isExtraRevision,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error requesting revision:', error);
    return NextResponse.json(
      { error: 'Failed to request revision' },
      { status: 500 }
    );
  }
}
