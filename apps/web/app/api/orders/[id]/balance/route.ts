import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createRazorpayOrder, isRazorpayConfigured, RAZORPAY_KEY_ID } from '@/lib/razorpay';
import { canAccessOrder } from '@/lib/order-access';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * POST /api/orders/[id]/balance
 * Creates a Razorpay order for the pending balance of an existing order so the
 * customer can pay it (after mockup approval). Amount is computed server-side.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        { error: 'Payments are not configured. Please contact support.' },
        { status: 503 }
      );
    }

    const order = await prisma.order.findUnique({ where: { id: params.id } });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (!canAccessOrder(order, session.user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const billing = (order.billingJson as any) || {};
    const grandTotal = Number(order.grandTotal);
    const amountPaid = Number(billing.amountPaid ?? 0);
    const balanceDue = round2(Math.max(0, grandTotal - amountPaid));

    if (!(balanceDue > 0)) {
      return NextResponse.json({ error: 'No balance is due on this order.' }, { status: 400 });
    }

    const rzpOrder = await createRazorpayOrder({
      amountPaise: Math.round(balanceDue * 100),
      receipt: `bal_${order.id}`.slice(0, 40),
      notes: { orderId: order.id, kind: 'balance', placedById: session.user.id },
    });

    return NextResponse.json({
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: RAZORPAY_KEY_ID,
      balanceDue,
    });
  } catch (error: any) {
    console.error('❌ Error creating balance payment order:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to start balance payment' },
      { status: 500 }
    );
  }
}
