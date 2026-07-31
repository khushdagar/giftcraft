import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { markAdminNotificationsRead } from '@/lib/admin-notifications';
import { fetchGhlLeads, recentLeads } from '@/lib/ghl';

/**
 * POST /api/admin/notifications/read
 * Body: { keys: string[] } — mark these notification keys read, OR
 *       { type: 'order' | 'review' | 'enquiry' | 'sample' | 'download' | 'dispute' }
 *       — mark ALL current notifications of that type read. Fired when the
 *       admin actually visits the page a notification points to, so items
 *       count as "seen" on arrival (not on click).
 */
async function keysForType(type: string): Promise<string[]> {
  switch (type) {
    case 'order': {
      const rows = await prisma.order.findMany({
        where: { status: 'confirmed' },
        select: { id: true },
      });
      return rows.map((r) => `order-${r.id}`);
    }
    case 'review': {
      const rows = await prisma.review.findMany({
        where: { status: 'pending' },
        select: { id: true },
      });
      return rows.map((r) => `review-${r.id}`);
    }
    case 'enquiry': {
      // The Enquiries page shows website enquiries AND GHL leads, so visiting
      // it clears both.
      const [rows, ghl] = await Promise.all([
        prisma.enquiry.findMany({ where: { status: 'new' }, select: { id: true } }),
        fetchGhlLeads().catch(() => ({ status: 'error' as const })),
      ]);
      const ghlKeys =
        ghl.status === 'ok' ? recentLeads(ghl.leads).map((l) => `ghl-${l.id}`) : [];
      return [...rows.map((r) => `enquiry-${r.id}`), ...ghlKeys];
    }
    case 'sample': {
      const rows = await prisma.sampleOrder.findMany({
        where: { status: 'requested' },
        select: { id: true },
      });
      return rows.map((r) => `sample-${r.id}`);
    }
    case 'download': {
      const rows = await prisma.proposalDownload.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        select: { id: true },
      });
      return rows.map((r) => `download-${r.id}`);
    }
    case 'dispute': {
      const rows = await prisma.disputeTicket.findMany({
        where: { status: { in: ['open', 'under_review'] } },
        select: { id: true },
      });
      return rows.map((r) => `dispute-${r.id}`);
    }
    default:
      return [];
  }
}
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    let keys: string[] = Array.isArray(body?.keys) ? body.keys : [];

    if (keys.length === 0 && typeof body?.type === 'string') {
      keys = await keysForType(body.type);
    }

    await markAdminNotificationsRead(session.user.id, keys);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notifications read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications read' },
      { status: 500 }
    );
  }
}
