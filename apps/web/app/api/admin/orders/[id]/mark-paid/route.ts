import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendPaymentSuccessEmail } from '@/lib/email';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * POST /api/admin/orders/[id]/mark-paid
 * Admin-only. Records the remaining balance as paid OFFLINE (e.g. bank
 * transfer) and — if the mockup is already approved — moves the order to
 * production. Keeps payment records accurate without a Razorpay transaction.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const adminNote: string | undefined = body?.note;

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { placedBy: { select: { email: true, name: true } } },
    });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const billing = (order.billingJson as any) || {};
    const grandTotal = Number(order.grandTotal);
    const amountPaid = Number(billing.amountPaid ?? 0);
    const balanceDue = round2(Math.max(0, grandTotal - amountPaid));

    if (balanceDue <= 0) {
      return NextResponse.json({ error: 'This order is already fully paid.' }, { status: 400 });
    }

    // Advance to production only from the payment-pending (mockup_approved)
    // state; otherwise just record the payment without changing the stage.
    const nextStatus = order.status === 'mockup_approved' ? 'production' : order.status;

    await prisma.order.update({
      where: { id: order.id },
      data: {
        billingJson: {
          ...billing,
          amountPaid: grandTotal,
          paymentType: 'full',
          paymentMethod: 'offline',
          offlineMarkedBy: session.user.id,
        },
        paidAt: order.paidAt ?? new Date(),
        status: nextStatus,
      },
    });

    await prisma.orderTimeline.create({
      data: {
        orderId: order.id,
        status: nextStatus,
        note:
          adminNote ||
          `Balance of ₹${balanceDue.toFixed(2)} marked as paid (offline) by admin`,
        actorId: session.user.id,
      },
    });

    // Receipt email (best-effort).
    const email = order.placedBy?.email || billing.email;
    if (email) {
      try {
        await sendPaymentSuccessEmail({
          customerEmail: email,
          customerName: order.placedBy?.name || billing.name || 'there',
          orderNumber: order.orderNumber,
          orderId: order.id,
          amountPaid: grandTotal,
          paymentId: 'OFFLINE',
          isAdvance: false,
          grandTotal,
        });
      } catch (e) {
        console.error('Offline payment email failed (non-blocking):', e);
      }
    }

    return NextResponse.json({ success: true, status: nextStatus });
  } catch (error: any) {
    console.error('❌ Error marking order paid:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to mark order as paid' },
      { status: 500 }
    );
  }
}
