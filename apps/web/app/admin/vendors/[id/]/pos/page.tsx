import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { formatRupees } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Vendor POs - GiftCraft Admin',
  description: 'Manage vendor purchase orders',
};

export default async function AdminVendorPOsPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session || session.user?.role !== 'super_admin') {
    redirect('/unauthorized');
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, pos: { include: { order: { select: { orderNumber: true, packQuantity: true } } } } },
  });

  if (!vendor) {
    redirect('/admin/vendors');
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
      completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      cancelled: 'bg-red-50 text-red-700 border-red-200',
    };
    return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-ink-3">
        <Link href={`/admin/vendors/${vendor.id}`} className="text-em hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      <h1 className="text-3xl font-black text-ink">POs for {vendor.name}</h1>

      {vendor.pos.length === 0 ? (
        <div className="rounded-md border-2 border-bdr bg-white p-12 text-center">
          <p className="text-ink-2">No POs assigned to this vendor</p>
        </div>
      ) : (
        <div className="rounded-md border-2 border-bdr overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-bdr">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-ink-2 uppercase">Order</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-ink-2 uppercase">Qty</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-ink-2 uppercase">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-ink-2 uppercase">Deadline</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-ink-2 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bdr">
              {vendor.pos.map((po) => (
                <tr key={po.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-semibold text-ink">{po.order.orderNumber}</td>
                  <td className="px-6 py-4 text-center text-sm text-ink">{po.order.packQuantity}</td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-ink tabnum">
                    {formatRupees(Number(po.totalAmount))}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-2">
                    {new Date(po.deadline).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full border-2 ${getStatusColor(po.status)}`}>
                      {po.status === 'in_progress' ? 'In Progress' : po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
