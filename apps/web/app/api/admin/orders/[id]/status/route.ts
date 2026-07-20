import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getSlaMinutes } from '@/lib/sla-config';
import { executeTrigger } from '@/lib/automation';
import { sendOrderStatusEmail } from '@/lib/email';
import { sendPushToUser } from '@/lib/push';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { status, note } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Validate status is a valid enum value
    const validStatuses = [
      'draft', 'quote_sent', 'confirmed', 'mockup_pending', 'mockup_approved',
      'payment_pending', 'production', 'quality_check', 'packed', 'shipped',
      'in_transit', 'delivered', 'completed', 'cancelled', 'refunded'
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status: ${status}` },
        { status: 400 }
      );
    }

    // Fetch current order with existing SlaLog
    const currentOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!currentOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Fetch active SLA log for this order
    const currentSla = await prisma.orderSlaLog.findFirst({
      where: { orderId: id, exitedAt: null },
      orderBy: { enteredAt: 'desc' },
      select: {
        id: true,
        orderId: true,
        stage: true,
        enteredAt: true,
        exitedAt: true,
        slaMinutes: true,
        isBreached: true,
      },
    });

    // Exit current SlaLog entry if one exists
    if (currentSla) {
      const now = new Date();
      const elapsedMs = now.getTime() - currentSla.enteredAt.getTime();
      const elapsedMinutes = elapsedMs / (1000 * 60);
      const isBreached = elapsedMinutes > currentSla.slaMinutes;

      await prisma.orderSlaLog.update({
        where: { id: currentSla.id },
        data: {
          exitedAt: now,
          isBreached,
        },
      });
    }

    // Update order status
    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        company: { select: { id: true } },
        placedBy: { select: { email: true, name: true } },
      },
    });

    // Create new SlaLog entry for the incoming stage
    const slaConfig = await getSlaMinutes();
    const slaMinutes = slaConfig[status] ?? 0;
    if (slaMinutes > 0) {
      await prisma.orderSlaLog.create({
        data: {
          orderId: id,
          stage: status,
          slaMinutes,
          enteredAt: new Date(),
        },
      });
    }

    // Create timeline entry
    await prisma.orderTimeline.create({
      data: {
        orderId: id,
        status,
        note: note || `Status updated to ${status}`,
        actorId: session.user.id,
      },
    });

    // Trigger automation rules based on status change
    const triggerMap: Record<string, 'order_placed' | 'order_confirmed' | 'order_shipped' | 'order_delivered' | 'order_cancelled'> = {
      confirmed: 'order_confirmed',
      shipped: 'order_shipped',
      delivered: 'order_delivered',
      cancelled: 'order_cancelled',
    };

    const trigger = triggerMap[status];
    if (trigger) {
      await executeTrigger(trigger, {
        orderId: id,
        companyId: order.companyId || undefined,
        customerEmail: order.placedBy?.email || undefined,
        orderNumber: order.orderNumber,
      });
    }

    // Email the customer on every status change (best-effort — never block).
    const billing = (order.billingJson as any) || {};
    const customerEmail = order.placedBy?.email || billing.email;
    if (customerEmail) {
      try {
        await sendOrderStatusEmail({
          customerEmail,
          customerName: order.placedBy?.name || billing.name || 'there',
          orderNumber: order.orderNumber,
          orderId: order.id,
          status,
          note: note || undefined,
        });
      } catch (e) {
        console.error('Status email failed (non-blocking):', e);
      }
    }

    // Web push to the customer (best-effort; respects their notif prefs).
    if (order.placedById) {
      sendPushToUser(
        order.placedById,
        {
          title: `Order ${order.orderNumber} updated`,
          body: `Your order is now "${status.replace(/_/g, ' ')}".`,
          url: `/dashboard/orders/${order.id}`,
          tag: `order-${order.id}`,
        },
        { event: 'orderStatus' }
      ).catch(() => {});
    }

    return NextResponse.json(
      { id: order.id, orderNumber: order.orderNumber, status: order.status },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
