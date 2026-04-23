import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

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

    // Verify order belongs to user
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { placedById: true, status: true },
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

    // Update order status to mockup_approved
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'mockup_approved' },
      select: { id: true, status: true },
    });

    // Create timeline entry
    await prisma.orderTimeline.create({
      data: {
        orderId: orderId,
        status: 'mockup_approved',
        note: 'Customer approved mockup. Production can begin.',
        actorId: session.user.id,
      },
    });

    return NextResponse.json(
      { message: 'Mockup approved successfully', order: updated },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error approving mockup:', error);
    return NextResponse.json(
      { error: 'Failed to approve mockup' },
      { status: 500 }
    );
  }
}
