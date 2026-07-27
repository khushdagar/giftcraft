import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { formatRupees } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'PO Details - GIVOO Vendor',
  description: 'View purchase order',
};

export default async function VendorPODetailPage({ params }: { params: { poId: string } }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'vendor') {
    redirect('/unauthorized');
  }

  const vendor = await prisma.vendor.findFirst({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!vendor) redirect('/unauthorized');

  const po = await prisma.vendorPO.findUnique({
    where: { id: params.poId },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          packQuantity: true,
          status: true,
          grandTotal: true,
          company: { select: { id: true, name: true, phone: true } },
          items: { select: { productId: true, quantity: true, unitPrice: true } },
        },
      },
    },
  });

  if (!po || po.vendorId !== vendor.id) {
    redirect('/vendor/po');
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-50 text-amber-700',
      in_progress: 'bg-blue-50 text-blue-700',
      completed: 'bg-emerald-50 text-emerald-700',
      cancelled: 'bg-red-50 text-red-700',
    };
    return colors[status] || 'bg-gray-50 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-ink-3">
        <Link href="/vendor/po" className="text-em hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      <h1 className="text-3xl font-normal text-ink">PO: {po.order.orderNumber}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-md border-2 border-bdr bg-white p-6">
            <p className="text-xs font-normal uppercase tracking-wider text-ink-3 mb-4">Order Info</p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-2">Company</span>
                <span className="font-normal text-ink">{po.order.company?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-2">Quantity</span>
                <span className="font-normal text-ink">{po.order.packQuantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-2">Deadline</span>
                <span className="font-normal text-ink">{new Date(po.deadline).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t border-bdr pt-3">
                <span className="text-ink-2">Amount</span>
                <span className="font-normal text-ink tabnum">{formatRupees(Number(po.totalAmount))}</span>
              </div>
            </div>
          </div>

          <div className="rounded-md border-2 border-bdr bg-white p-6">
            <p className="text-xs font-normal uppercase tracking-wider text-ink-3 mb-4">Items</p>
            <div className="space-y-2 text-sm">
              {po.order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between pb-2 border-b border-bdr last:border-0">
                  <div>
                    <p className="font-normal text-ink">{item.productId}</p>
                    <p className="text-xs text-ink-2">{formatRupees(Number(item.unitPrice))}</p>
                  </div>
                  <span className="font-normal">{item.quantity} units</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-md border-2 border-bdr bg-white p-6">
            <p className="text-xs font-normal uppercase tracking-wider text-ink-3 mb-3">Status</p>
            <span className={`inline-block text-sm font-normal px-4 py-2 rounded-full ${getStatusColor(po.status)}`}>
              {po.status === 'in_progress' ? 'In Progress' : po.status.charAt(0).toUpperCase() + po.status.slice(1)}
            </span>
          </div>

          <div className="rounded-md border-2 border-bdr bg-white p-6">
            <p className="text-xs font-normal uppercase tracking-wider text-ink-3 mb-3">Contact</p>
            <div className="text-sm">
              <p className="font-normal text-ink">{po.order.company?.name || 'N/A'}</p>
              <p className="text-ink-2">{po.order.company?.phone || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
