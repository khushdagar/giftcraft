import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Decimal } from '@prisma/client/runtime/library';

export const revalidate = 60;

function formatRupees(amount: Decimal | number) {
  const num = amount instanceof Decimal ? amount.toNumber() : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
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

export default async function AdminClientsPage() {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const companies = await prisma.company.findMany({
    include: {
      users: true,
      orders: {
        where: { status: { in: ['confirmed', 'completed', 'shipped'] } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const clients = companies.map((company) => ({
    id: company.id,
    name: company.name,
    email: company.users[0]?.email || 'N/A',
    tier: company.tier,
    totalOrders: company.orders.length,
    totalSpent: company.orders.reduce((sum, order) => sum.plus(order.grandTotal), new Decimal(0)),
  }));

  return (
    <>
      <div className="mb-8 border-b border-bdr pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-ink">Clients</h1>
            <p className="mt-1 text-sm text-ink-2">{clients.length} clients total</p>
          </div>
          <Button asChild className="rounded-2xl bg-em px-6 py-2 font-bold hover:bg-em-600">
            <Link href="/admin/clients/new">+ New Client</Link>
          </Button>
        </div>
      </div>

      <div className="border border-bdr rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-elevated border-b border-bdr">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-ink-2 uppercase">Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-ink-2 uppercase">Email</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-ink-2 uppercase">Tier</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-ink-2 uppercase">Orders</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-ink-2 uppercase">Total Spent</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-ink-2 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bdr">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-canvas">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-ink">{client.name}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-ink-2">{client.email}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${getTierBadgeColor(client.tier)}`}>
                    {client.tier}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-ink-2">{client.totalOrders}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-semibold text-ink">{formatRupees(client.totalSpent)}</p>
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/clients/${client.id}`}>View</Link>
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
