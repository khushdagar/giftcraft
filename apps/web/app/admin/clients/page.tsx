import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Decimal } from '@prisma/client/runtime/library';

export const dynamic = 'force-dynamic';

function formatRupees(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getTierBadgeColor(tier: string) {
  const colors: Record<string, string> = {
    standard: 'bg-gray-100 text-gray-700',
    silver: 'bg-blue-100 text-blue-700',
    gold: 'bg-amber-100 text-amber-700',
    platinum: 'bg-purple-100 text-purple-700',
  };
  return colors[tier] || colors.standard;
}

const fmtDate = (d: Date | null) =>
  d ? d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—';

// Real placed orders only — exclude drafts and unconverted quotes.
const PLACED_STATUSES = [
  'confirmed',
  'mockup_pending',
  'mockup_approved',
  'production',
  'quality_check',
  'packed',
  'shipped',
  'in_transit',
  'delivered',
  'completed',
  'cancelled',
  'refunded',
] as const;

interface ClientRow {
  key: string;
  href: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  gstin: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: Date | null;
  tier: string;
  linked: boolean; // true = has a Company profile
}

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const q = (searchParams.q || '').trim().toLowerCase();

  // Companies (client profiles customers set up) + all placed orders. Orders
  // are attributed to a company via the placer's companyId, so a company's
  // full order history shows even though orders aren't directly linked.
  const [companies, orders] = await Promise.all([
    prisma.company.findMany({
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    prisma.order.findMany({
      where: { status: { in: [...PLACED_STATUSES] } },
      select: {
        grandTotal: true,
        createdAt: true,
        billingJson: true,
        placedBy: {
          select: { id: true, name: true, email: true, companyId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Aggregate orders by company, and separately for orders placed by users who
  // haven't set up a company yet (legacy / guest-style clients).
  const byCompany = new Map<
    string,
    { orders: number; spent: number; last: Date }
  >();
  const unlinked = new Map<
    string,
    {
      name: string;
      email: string;
      phone: string;
      gstin: string;
      companyName: string;
      orders: number;
      spent: number;
      last: Date;
    }
  >();

  for (const o of orders) {
    const amount = Number(o.grandTotal);
    const companyId = o.placedBy?.companyId;
    if (companyId) {
      const agg = byCompany.get(companyId) ?? { orders: 0, spent: 0, last: o.createdAt };
      agg.orders += 1;
      agg.spent += amount;
      if (o.createdAt > agg.last) agg.last = o.createdAt;
      byCompany.set(companyId, agg);
    } else if (o.placedBy) {
      const billing = (o.billingJson as any) || {};
      const existing = unlinked.get(o.placedBy.id);
      if (existing) {
        existing.orders += 1;
        existing.spent += amount;
        if (o.createdAt > existing.last) existing.last = o.createdAt;
      } else {
        // Orders are newest-first, so the first one seen is the latest billing.
        unlinked.set(o.placedBy.id, {
          name: o.placedBy.name || billing.name || billing.contactName || 'Guest',
          email: o.placedBy.email || billing.email || 'N/A',
          phone: billing.phone || 'N/A',
          gstin: billing.gstin || 'N/A',
          companyName: billing.companyName || o.placedBy.name || 'Guest',
          orders: 1,
          spent: amount,
          last: o.createdAt,
        });
      }
    }
  }

  const companyRows: ClientRow[] = companies.map((c) => {
    const agg = byCompany.get(c.id);
    const primary = c.users[0];
    return {
      key: `c-${c.id}`,
      href: `/admin/clients/${c.id}`,
      companyName: c.name,
      contactPerson: primary?.name || '—',
      email: primary?.email || '—',
      phone: c.phone || '—',
      gstin: c.gstin || '—',
      totalOrders: agg?.orders ?? 0,
      totalSpent: agg?.spent ?? 0,
      lastOrderAt: agg?.last ?? null,
      tier: c.tier,
      linked: true,
    };
  });

  const unlinkedRows: ClientRow[] = [...unlinked.entries()].map(([userId, u]) => ({
    key: `u-${userId}`,
    href: `/admin/orders?placedBy=${userId}`,
    companyName: u.companyName,
    contactPerson: u.name,
    email: u.email,
    phone: u.phone,
    gstin: u.gstin,
    totalOrders: u.orders,
    totalSpent: u.spent,
    lastOrderAt: u.last,
    tier: 'standard',
    linked: false,
  }));

  let clients = [...companyRows, ...unlinkedRows];

  if (q) {
    clients = clients.filter(
      (c) =>
        c.companyName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.contactPerson.toLowerCase().includes(q) ||
        c.gstin.toLowerCase().includes(q)
    );
  }

  // Most recent order first; companies without orders fall to the bottom by name.
  clients.sort((a, b) => {
    const at = a.lastOrderAt?.getTime() ?? 0;
    const bt = b.lastOrderAt?.getTime() ?? 0;
    if (bt !== at) return bt - at;
    return a.companyName.localeCompare(b.companyName);
  });

  return (
    <>
      <div className="mb-8 border-b border-bdr pb-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-normal tracking-tight text-ink">Clients</h1>
            <p className="mt-1 text-sm text-ink-2">{clients.length} clients total</p>
          </div>
          <div className="flex items-center gap-3">
            <form method="get" className="flex items-center gap-2">
              <input
                type="text"
                name="q"
                defaultValue={searchParams.q || ''}
                placeholder="Search name, email, or GSTIN…"
                className="w-56 rounded-lg border border-bdr px-3 py-2 text-sm"
              />
              <Button type="submit" variant="outline" size="sm">
                Search
              </Button>
              {q && (
                <Link href="/admin/clients" className="text-xs text-ink-2 hover:underline">
                  Clear
                </Link>
              )}
            </form>
            <Button asChild className="rounded-2xl bg-em px-6 py-2 font-normal hover:bg-em-600">
              <Link href="/admin/clients/new">+ New Client</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="border border-bdr rounded-lg overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead className="bg-elevated border-b border-bdr">
            <tr>
              <th className="px-5 py-4 text-left text-xs font-normal text-ink-2 uppercase">Company</th>
              <th className="px-5 py-4 text-left text-xs font-normal text-ink-2 uppercase">Contact</th>
              <th className="px-5 py-4 text-left text-xs font-normal text-ink-2 uppercase">Email</th>
              <th className="px-5 py-4 text-left text-xs font-normal text-ink-2 uppercase">Phone</th>
              <th className="px-5 py-4 text-left text-xs font-normal text-ink-2 uppercase">GSTIN</th>
              <th className="px-5 py-4 text-left text-xs font-normal text-ink-2 uppercase">Orders</th>
              <th className="px-5 py-4 text-left text-xs font-normal text-ink-2 uppercase">Revenue</th>
              <th className="px-5 py-4 text-left text-xs font-normal text-ink-2 uppercase">Last Order</th>
              <th className="px-5 py-4 text-left text-xs font-normal text-ink-2 uppercase">Tier</th>
              <th className="px-5 py-4 text-right text-xs font-normal text-ink-2 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bdr">
            {clients.length === 0 && (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-sm text-ink-2">
                  {q
                    ? 'No clients match your search.'
                    : 'No clients yet. They appear here once a company is set up or an order is placed.'}
                </td>
              </tr>
            )}
            {clients.map((client) => (
              <tr key={client.key} className="hover:bg-canvas">
                <td className="px-5 py-4">
                  <p className="text-sm font-medium text-ink">{client.companyName}</p>
                  {!client.linked && (
                    <span className="text-[10px] uppercase tracking-wider text-ink-3">
                      No profile yet
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm text-ink-2">{client.contactPerson}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm text-ink-2">{client.email}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm text-ink-2">{client.phone}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm text-ink-2">{client.gstin}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm text-ink-2">{client.totalOrders}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm font-normal text-ink">{formatRupees(client.totalSpent)}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm text-ink-2">{fmtDate(client.lastOrderAt)}</p>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-normal capitalize ${getTierBadgeColor(client.tier)}`}>
                    {client.tier}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={client.href}>View Orders</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
