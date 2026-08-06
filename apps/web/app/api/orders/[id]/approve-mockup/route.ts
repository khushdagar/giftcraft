import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendBalancePaymentLinkEmail } from '@/lib/email';
import { canAccessOrder } from '@/lib/order-access';
import { sendPushToAdmins } from '@/lib/push';

const round2 = (n: number) => Math.round(n * 100) / 100;

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

    // Verify the order belongs to the buyer (either of their sign-in addresses,
    // via the company).
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        placedById: true,
        companyId: true,
        status: true,
        orderNumber: true,
        grandTotal: true,
        billingJson: true,
        placedBy: { select: { name: true, email: true } },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (!canAccessOrder(order, session.user)) {
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

    // Anything still owed after the advance. With a balance outstanding the
    // order waits in mockup_approved until it's paid; otherwise straight to
    // production. Mirrors the public /api/approve/[token] flow.
    const billing = (order.billingJson as any) || {};
    const grandTotal = Number(order.grandTotal);
    const balanceDue = round2(Math.max(0, grandTotal - Number(billing.amountPaid ?? 0)));
    const nextStatus = balanceDue > 0 ? 'mockup_approved' : 'production';

    // Status + the artwork record + timeline move together, so we can never end
    // up approved-but-unadvanced.
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.order.update({
        where: { id: orderId },
        data: { status: nextStatus as any },
        select: { id: true, status: true },
      });
      // Close out the open approval request, if the admin raised one — this is
      // what the admin bell reads to surface "mockup approved".
      await tx.artworkApproval.updateMany({
        where: { orderId, status: 'pending' },
        data: { status: 'approved', approvedAt: new Date() },
      });
      await tx.orderTimeline.create({
        data: {
          orderId: orderId,
          status: nextStatus as any,
          note:
            balanceDue > 0
              ? `Customer approved mockup — balance of ₹${balanceDue.toFixed(2)} pending`
              : 'Customer approved mockup. Production can begin.',
          actorId: session.user.id,
        },
      });
      return u;
    });

    // Email the customer a payment link for the pending balance (best-effort).
    const customerEmail = order.placedBy?.email || billing.email;
    if (balanceDue > 0 && customerEmail) {
      try {
        await sendBalancePaymentLinkEmail({
          customerEmail,
          customerName: order.placedBy?.name || billing.name || 'there',
          orderNumber: order.orderNumber,
          orderId,
          balanceDue,
        });
      } catch (e) {
        console.error('Balance payment email failed (non-blocking):', e);
      }
    }

    sendPushToAdmins({
      title: `Mockup approved on ${order.orderNumber}`,
      body:
        balanceDue > 0
          ? `Balance of ₹${balanceDue.toFixed(2)} pending — payment link sent to the customer.`
          : 'Fully paid — ready for production.',
      url: `/admin/orders/${orderId}`,
      tag: `approval-order-${orderId}`,
    }).catch(() => {});

    return NextResponse.json(
      { message: 'Mockup approved successfully', order: updated, balanceDue },
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
