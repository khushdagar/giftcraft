import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { fetchGhlLeads, recentLeads } from '@/lib/ghl';

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

    // Event-style notifications (approvals, payments) have no "pending" state to
    // query, so they're windowed to the last 14 days and cleared by the admin.
    const eventWindow = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [
      newOrders,
      mockupApprovals,
      balancePayments,
      revisionRequests,
      openDisputes,
      pendingReviews,
      pendingComments,
      newEnquiries,
      vendorApplications,
      sampleRequests,
      deckDownloads,
      sentProposals,
      confirmedOrders,
      readRows,
      ghlResult,
    ] = await Promise.all([
      // Newly placed orders awaiting action.
      prisma.order.findMany({
        where: { status: 'confirmed' },
        select: { id: true, orderNumber: true, packQuantity: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Customers who approved their mockup — production (or the balance
      // payment) is now the admin's next action.
      prisma.artworkApproval.findMany({
        where: { status: 'approved', approvedAt: { gte: eventWindow } },
        select: {
          id: true,
          revision: true,
          approvedAt: true,
          order: {
            select: { id: true, orderNumber: true, status: true, grandTotal: true, billingJson: true },
          },
        },
        orderBy: { approvedAt: 'desc' },
        take: 10,
      }),
      // Balance payments collected after mockup approval.
      prisma.orderTimeline.findMany({
        where: {
          note: { startsWith: 'Balance payment received' },
          createdAt: { gte: eventWindow },
        },
        select: {
          id: true,
          createdAt: true,
          order: { select: { id: true, orderNumber: true, grandTotal: true } },
        },
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
      // Product reviews awaiting moderation.
      prisma.review.findMany({
        where: { status: 'pending' },
        select: {
          id: true,
          rating: true,
          createdAt: true,
          product: { select: { name: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Blog comments awaiting moderation (nothing is public until approved).
      prisma.blogComment.findMany({
        where: { status: 'pending' },
        select: {
          id: true,
          authorName: true,
          createdAt: true,
          post: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Fresh enquiries (product quick-quotes + contact page).
      prisma.enquiry.findMany({
        where: { status: 'new' },
        select: {
          id: true,
          companyName: true,
          contactName: true,
          productName: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // "Sell With Us" vendor applications awaiting review.
      prisma.vendor.findMany({
        where: { onboardingStatus: 'pending', source: 'self_registration' },
        select: { id: true, name: true, city: true, type: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Sample requests awaiting approval.
      prisma.sampleOrder.findMany({
        where: { status: 'requested' },
        select: {
          id: true,
          createdAt: true,
          product: { select: { name: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Proposal deck downloads (lead signals) from the last 7 days.
      prisma.proposalDownload.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        select: { id: true, name: true, company: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Proposals emailed to leads in the last 14 days — confirmation that the
      // send actually went out, and a shortcut back to the links.
      prisma.proposal.findMany({
        where: { createdAt: { gte: eventWindow } },
        select: {
          id: true,
          recipientEmail: true,
          recipientName: true,
          companyName: true,
          shareToken: true,
          createdAt: true,
          quote: { select: { shareToken: true } },
          _count: { select: { packs: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // All NEW (confirmed, unprocessed) orders — the nav badge counts the ones
      // this admin hasn't seen yet, and hides once they're viewed.
      prisma.order.findMany({
        where: { status: 'confirmed' },
        select: { id: true },
      }),
      // Notifications this admin has already read or cleared.
      prisma.adminNotificationRead.findMany({
        where: { userId: session.user.id },
        select: { key: true, dismissed: true },
      }),
      // GoHighLevel leads (30s-cached). Never block the bell on a CRM outage.
      fetchGhlLeads().catch(() => ({ status: 'error' as const, error: 'unavailable' })),
    ]);

    const ghlLeads =
      ghlResult.status === 'ok' ? recentLeads(ghlResult.leads).slice(0, 10) : [];

    // A row means "read"; a dismissed row means "cleared" (hidden entirely).
    const readKeys = new Set(readRows.map((r) => r.key));
    const dismissedKeys = new Set(readRows.filter((r) => r.dismissed).map((r) => r.key));

    const notifications = [
      ...newOrders.map((o) => ({
        id: `order-${o.id}`,
        type: 'order' as const,
        title: `New order ${o.orderNumber}`,
        subtitle: `${o.packQuantity} packs — needs processing`,
        href: `/admin/orders/${o.id}`,
        createdAt: o.createdAt.toISOString(),
      })),
      ...mockupApprovals.map((a) => {
        const billing = (a.order?.billingJson as Record<string, unknown> | null) || {};
        const balanceDue = Math.max(
          0,
          Number(a.order?.grandTotal ?? 0) - Number((billing.amountPaid as number) ?? 0)
        );
        return {
          id: `approval-${a.id}`,
          type: 'approval' as const,
          title: `Mockup approved${a.order ? ` on ${a.order.orderNumber}` : ''}`,
          subtitle:
            balanceDue > 0
              ? `v${a.revision} approved — balance ₹${balanceDue.toFixed(2)} pending, payment link sent`
              : `v${a.revision} approved — ready for production`,
          href: a.order ? `/admin/orders/${a.order.id}` : '/admin/orders',
          createdAt: (a.approvedAt ?? new Date()).toISOString(),
        };
      }),
      ...balancePayments.map((t) => ({
        id: `payment-${t.id}`,
        type: 'payment' as const,
        title: `Balance paid${t.order ? ` on ${t.order.orderNumber}` : ''}`,
        subtitle: `₹${Number(t.order?.grandTotal ?? 0).toFixed(2)} settled in full — moved to production`,
        href: t.order ? `/admin/orders/${t.order.id}` : '/admin/orders',
        createdAt: t.createdAt.toISOString(),
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
      ...pendingReviews.map((r) => ({
        id: `review-${r.id}`,
        type: 'review' as const,
        title: `New ${r.rating}★ review on ${r.product.name}`,
        subtitle: `by ${r.user?.name || 'a customer'} — awaiting approval`,
        href: '/admin/reviews?status=pending',
        createdAt: r.createdAt.toISOString(),
      })),
      ...pendingComments.map((c) => ({
        id: `comment-${c.id}`,
        type: 'comment' as const,
        title: `New comment by ${c.authorName}`,
        subtitle: `on "${c.post.title}" — awaiting moderation`,
        href: '/admin/blog/comments',
        createdAt: c.createdAt.toISOString(),
      })),
      ...vendorApplications.map((v) => ({
        id: `vendor-${v.id}`,
        type: 'vendor' as const,
        title: `Vendor application: ${v.name}`,
        subtitle: [v.type, v.city].filter(Boolean).join(' — ') || 'Awaiting review',
        href: `/admin/vendors/${v.id}`,
        createdAt: v.createdAt.toISOString(),
      })),
      ...newEnquiries.map((e) => ({
        id: `enquiry-${e.id}`,
        type: 'enquiry' as const,
        title: `New enquiry from ${e.companyName}`,
        subtitle: e.productName ? `About ${e.productName}` : `${e.contactName} — via contact page`,
        href: '/admin/enquiries',
        createdAt: e.createdAt.toISOString(),
      })),
      ...ghlLeads.map((l) => ({
        id: `ghl-${l.id}`,
        type: 'enquiry' as const,
        title: `New GHL lead${l.name ? ` from ${l.name}` : ''}`,
        subtitle: [l.companyName, l.productName, l.formName ? `via ${l.formName}` : null]
          .filter(Boolean)
          .join(' — ') || l.email || 'GoHighLevel',
        href: '/admin/enquiries',
        createdAt: l.dateAdded as string,
      })),
      ...sampleRequests.map((s) => ({
        id: `sample-${s.id}`,
        type: 'sample' as const,
        title: `Sample request: ${s.product.name}`,
        subtitle: `by ${s.user?.name || 'a customer'} — awaiting approval`,
        href: '/admin/samples',
        createdAt: s.createdAt.toISOString(),
      })),
      ...deckDownloads.map((d) => ({
        id: `download-${d.id}`,
        type: 'download' as const,
        title: `Proposal deck downloaded`,
        subtitle: `${d.name}${d.company ? ` — ${d.company}` : ''}`,
        href: '/admin/proposal-downloads',
        createdAt: d.createdAt.toISOString(),
      })),
      ...sentProposals.map((pr) => ({
        id: `proposal-${pr.id}`,
        type: 'proposal' as const,
        title:
          pr._count.packs > 1
            ? `Proposal sent — ${pr._count.packs} pack options`
            : 'Proposal sent',
        subtitle: `to ${pr.recipientName || pr.recipientEmail}${
          pr.companyName ? ` — ${pr.companyName}` : ''
        }`,
        href: pr.shareToken ? `/proposal/${pr.shareToken}` : `/quote/${pr.quote.shareToken}`,
        createdAt: pr.createdAt.toISOString(),
      })),
    ]
      // Hide only cleared notifications; read-but-not-cleared ones stay visible.
      .filter((n) => !dismissedKeys.has(n.id))
      .map((n) => ({ ...n, read: readKeys.has(n.id) }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    // Badge reflects UNREAD notifications only.
    const unreadCount = notifications.filter((n) => !n.read).length;

    // Orders nav badge: new orders this admin hasn't seen yet. Viewing the
    // Orders page marks them seen, which hides the badge.
    const navOrdersCount = confirmedOrders.filter(
      (o) => !readKeys.has(`order-${o.id}`) && !dismissedKeys.has(`order-${o.id}`)
    ).length;

    return NextResponse.json({
      count: unreadCount,
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
