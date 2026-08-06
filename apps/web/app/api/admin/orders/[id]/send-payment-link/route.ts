import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendBalancePaymentLinkEmail } from '@/lib/email';
import { canAccessOrder } from '@/lib/order-access';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * POST /api/admin/orders/[id]/send-payment-link
 * Emails the customer the balance payment link on demand (admin or order owner).
 * Returns the actual send result so email failures are visible in the UI.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { placedBy: { select: { email: true, name: true } } },
    });
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

    if (balanceDue <= 0) {
      return NextResponse.json({ error: 'No balance is due on this order.' }, { status: 400 });
    }

    const email = order.placedBy?.email || billing.email;
    if (!email) {
      return NextResponse.json({ error: 'No customer email is on file for this order.' }, { status: 400 });
    }

    const result = await sendBalancePaymentLinkEmail({
      customerEmail: email,
      customerName: order.placedBy?.name || billing.name || 'there',
      orderNumber: order.orderNumber,
      orderId: order.id,
      balanceDue,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Email could not be sent. Check SendGrid configuration (API key / verified sender).' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, sentTo: email, balanceDue });
  } catch (error: any) {
    console.error('❌ Error sending payment link:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send payment link' },
      { status: 500 }
    );
  }
}
