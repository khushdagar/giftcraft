import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { formatRupees } from '@/lib/utils';
import Link from 'next/link';
import { Package } from 'lucide-react';

export const metadata = {
  title: 'Purchase Orders - GiftCraft Vendor',
  description: 'View all your purchase orders',
};

export default async function VendorPOListPage() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== 'vendor') {
    redirect('/unauthorized');
  }

  // Fetch vendor
  const vendor = await prisma.vendor.findFirst({
    where: { email: session.user.email },
    select: { id: true, name: true },
  });

  if (!vendor) redirect('/unauthorized');

  // Fetch POs
  const pos = await prisma.vendorPO.findMany({
    where: { vendorId: vendor.id },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          packQuantity: true,
          company: { select: { name: true } },
        },
      },
    },
    orderBy: { deadline: 'asc' },
  });

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
      <div>
        <h1 className="text-3xl font-normal text-ink">Purchase Orders</h1>
        <p className="text-sm text-ink-2 mt-1">
          Total: {pos.length} PO{pos.length !== 1 ? 's' : ''}
        </p>
      </div>

      {pos.length === 0 ? (
        <div className="rounded-md border-2 border-bdr bg-white p-12 text-center">
          <Package className="w-12 h-12 text-ink-3 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-normal text-ink mb-2">No Purchase Orders</h3>
          <p className="text-sm text-ink-2">
            You don't have any purchase orders assigned yet.
          </p>
        </div>
      ) : (
        <div className="rounded-md border-2 border-bdr overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-bdr">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">
                  Order
                </th>
                <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">
                  Company
                </th>
                <th className="px-6 py-4 text-center text-xs font-normal text-ink-2 uppercase">
                  Quantity
                </th>
                <th className="px-6 py-4 text-right text-xs font-normal text-ink-2 uppercase">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">
                  Deadline
                </th>
                <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-xs font-normal text-ink-2 uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bdr">
              {pos.map((po) => (
                <tr key={po.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm font-normal text-ink">
                    {po.order.orderNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-2">{po.order.company?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-center text-ink font-normal">
                    {po.order.packQuantity}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-normal text-ink tabnum">
                    {formatRupees(Number(po.totalAmount))}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-2">
                    {new Date(po.deadline).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block text-xs font-normal px-3 py-1 rounded-full border-2 ${getStatusColor(
                        po.status
                      )}`}
                    >
                      {po.status === 'in_progress' ? 'In Progress' : po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Link
                      href={`/vendor/po/${po.id}`}
                      className="text-em hover:underline font-normal text-sm"
                    >
                      View
                    </Link>
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
