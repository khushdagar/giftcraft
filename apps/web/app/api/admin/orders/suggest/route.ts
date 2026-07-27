import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/orders/suggest?q=GC-2026
 * Lightweight autocomplete for the orders search box. Matches on order number
 * or the customer/company name and returns a small, flat result set.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const q = (new URL(request.url).searchParams.get('q') || '').trim();
  if (q.length < 1) return NextResponse.json({ results: [] });

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { billingJson: { path: ['companyName'], string_contains: q } },
      ],
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      grandTotal: true,
      billingJson: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });

  const results = orders.map((o) => {
    const billing = (o.billingJson as any) || {};
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: Number(o.grandTotal),
      customer: billing.companyName || billing.email || '—',
    };
  });

  return NextResponse.json({ results });
}
