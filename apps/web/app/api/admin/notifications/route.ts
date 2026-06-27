import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/notifications
 * Actionable alerts for the admin top-bar bell (SOW §3.9.1 — new orders;
 * Stage-1 relevant additions: customer revision requests and open disputes).
 * Also returns the count of active orders for the Orders nav badge.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [newOrders, revisionRequests, openDisputes, navOrdersCount] = await Promise.all([
      // Newly placed orders awaiting action.
      prisma.order.findMany({
        where: { status: 'confirmed' },
        select: { id: true, orderNumber: true, packQuantity: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Customers who requested artwork changes.
      prisma.artworkApproval.findMany({
        where: { status: 'revision_requested' },
        select: {
          id: true,
          revision: true,
          createdAt: true,
          order: { select: { id: true, orderNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Open / under-review disputes.
      prisma.disputeTicket.findMany({
        where: { status: { in: ['open', 'under_review'] } },
        select: {
          id: true,
          subject: true,
          createdAt: true,
          order: { select: { orderNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Active orders (not in a terminal state) — drives the Orders nav badge.
      prisma.order.count({
        where: { status: { notIn: ['delivered', 'completed', 'cancelled', 'refunded'] } },
      }),
    ]);

    const notifications = [
      ...newOrders.map((o) => ({
        id: `order-${o.id}`,
        type: 'order' as const,
        title: `New order ${o.orderNumber}`,
        subtitle: `${o.packQuantity} packs — needs processing`,
        href: `/admin/orders/${o.id}`,
        createdAt: o.createdAt.toISOString(),
      })),
      ...revisionRequests.map((r) => ({
        id: `revision-${r.id}`,
        type: 'revision' as const,
        title: `Changes requested${r.order ? ` on ${r.order.orderNumber}` : ''}`,
        subtitle: `Customer asked for revisions to mockup v${r.revision}`,
        href: r.order ? `/admin/orders/${r.order.id}` : '/admin/orders',
        createdAt: r.createdAt.toISOString(),
      })),
      ...openDisputes.map((d) => ({
        id: `dispute-${d.id}`,
        type: 'dispute' as const,
        title: `Dispute${d.order ? ` on ${d.order.orderNumber}` : ''}`,
        subtitle: d.subject,
        href: `/admin/disputes/${d.id}`,
        createdAt: d.createdAt.toISOString(),
      })),
    ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return NextResponse.json({
      count: notifications.length,
      navOrdersCount,
      notifications,
    });
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
