import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { verifyRazorpaySignature } from '@/lib/razorpay';
import { sendPaymentSuccessEmail } from '@/lib/email';
import { sendPushToAdmins } from '@/lib/push';
import { canAccessOrder } from '@/lib/order-access';

/**
 * POST /api/orders/[id]/balance/verify
 * Verifies the balance payment, marks the order fully paid, and advances it to
 * production. Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature }
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = await req.json();

    const order = await prisma.order.findUnique({ where: { id: params.id } });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (!canAccessOrder(order, session.user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify the payment signature before trusting it.
    const valid = verifyRazorpaySignature({
      razorpayOrderId,
      razorpayPaymentId,
      signature: razorpaySignature,
    });
    if (!valid) {
      return NextResponse.json(
        { error: 'Payment verification failed. Your card has not been charged for this order.' },
        { status: 400 }
      );
    }

    const billing = (order.billingJson as any) || {};
    const grandTotal = Number(order.grandTotal);

    // Mark fully paid and move to production.
    await prisma.order.update({
      where: { id: order.id },
      data: {
        billingJson: {
          ...billing,
          amountPaid: grandTotal,
          paymentType: 'full',
          balancePaymentId: razorpayPaymentId,
        },
        // Cast: status string flows to the (regenerated) Prisma enum.
        status: 'production' as any,
      },
    });

    await prisma.orderTimeline.create({
      data: {
        orderId: order.id,
        status: 'production' as any,
        note: `Balance payment received (Razorpay ${razorpayPaymentId}) — moved to production`,
        actorId: session.user.id,
      },
    });

    // Confirmation email (best-effort).
    const customerEmail = billing.email;
    if (customerEmail) {
      try {
        await sendPaymentSuccessEmail({
          customerEmail,
          customerName: billing.name || billing.companyName || 'there',
          orderNumber: order.orderNumber,
          orderId: order.id,
          amountPaid: grandTotal,
          paymentId: razorpayPaymentId,
          isAdvance: false,
          grandTotal,
        });
      } catch (e) {
        console.error('Balance payment email failed (non-blocking):', e);
      }
    }

    // Ops alert — the order is now fully funded and needs to go into production.
    sendPushToAdmins({
      title: `Balance paid on ${order.orderNumber}`,
      body: `₹${grandTotal.toFixed(2)} settled in full — moved to production.`,
      url: `/admin/orders/${order.id}`,
      tag: `payment-${order.id}`,
    }).catch(() => {});

    return NextResponse.json({ success: true, status: 'production' });
  } catch (error: any) {
    console.error('❌ Error verifying balance payment:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to verify balance payment' },
      { status: 500 }
    );
  }
}
