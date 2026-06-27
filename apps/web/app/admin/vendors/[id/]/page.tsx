import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { formatRupees } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Vendor Details - GiftCraft Admin',
  description: 'View vendor details',
};

export default async function AdminVendorDetailPage({
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
    include: {
      vendorScore: true,
      pos: { select: { id: true, status: true, totalAmount: true, deadline: true, order: { select: { orderNumber: true } } } },
      payments: { select: { id: true, amount: true, status: true } },
    },
  });

  if (!vendor) {
    redirect('/admin/vendors');
  }

  const totalPOs = vendor.pos.length;
  const completedPOs = vendor.pos.filter((p) => p.status === 'completed').length;
  const totalRevenue = vendor.pos.reduce((sum, p) => sum + Number(p.totalAmount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-ink-3">
        <Link href="/admin/vendors" className="text-em hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      <h1 className="text-3xl font-normal text-ink">{vendor.name}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="rounded-md border-2 border-bdr bg-white p-4">
          <p className="text-xs font-normal uppercase text-ink-3">Total POs</p>
          <p className="text-2xl font-normal text-ink mt-2">{totalPOs}</p>
        </div>

        <div className="rounded-md border-2 border-bdr bg-white p-4">
          <p className="text-xs font-normal uppercase text-ink-3">Completed</p>
          <p className="text-2xl font-normal text-em mt-2">{completedPOs}</p>
        </div>

        <div className="rounded-md border-2 border-bdr bg-white p-4">
          <p className="text-xs font-normal uppercase text-ink-3">Revenue</p>
          <p className="text-xl font-normal text-ink mt-2 tabnum">{formatRupees(totalRevenue)}</p>
        </div>

        <div className="rounded-md border-2 border-bdr bg-white p-4">
          <p className="text-xs font-normal uppercase text-ink-3">Quality Score</p>
          <p className="text-2xl font-normal text-em mt-2">{vendor.vendorScore?.qualityScore || '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-md border-2 border-bdr bg-white p-6">
          <p className="text-xs font-normal uppercase text-ink-3 mb-4">Contact Info</p>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-ink-3">Email</p>
              <p className="font-normal text-ink break-all">{vendor.email}</p>
            </div>
            <div>
              <p className="text-ink-3">Phone</p>
              <p className="font-normal text-ink">{vendor.phone || '—'}</p>
            </div>
            <div>
              <p className="text-ink-3">Location</p>
              <p className="font-normal text-ink">{vendor.city && vendor.state ? `${vendor.city}, ${vendor.state}` : '—'}</p>
            </div>
            <div>
              <p className="text-ink-3">GST</p>
              <p className="font-normal text-ink">{vendor.gst || '—'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-md border-2 border-bdr bg-white p-6">
          <p className="text-xs font-normal uppercase text-ink-3 mb-4">Performance</p>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-ink-3 text-xs">Quality</p>
              <p className="font-normal text-em">{vendor.vendorScore?.qualityScore}/100</p>
            </div>
            <div>
              <p className="text-ink-3 text-xs">On-Time</p>
              <p className="font-normal text-em">{vendor.vendorScore?.onTimeScore}/100</p>
            </div>
            <div>
              <p className="text-ink-3 text-xs">Reliability</p>
              <p className="font-normal text-em">{vendor.vendorScore?.reliabilityScore}/100</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-md border-2 border-bdr bg-white p-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs font-normal uppercase text-ink-3">Recent POs</p>
          <Link href={`/admin/vendors/${vendor.id}/pos`} className="text-em font-normal hover:underline text-sm">
            View All
          </Link>
        </div>

        {vendor.pos.length === 0 ? (
          <p className="text-sm text-ink-2 text-center py-8">No POs assigned</p>
        ) : (
          <div className="space-y-2">
            {vendor.pos.slice(0, 5).map((po) => (
              <div key={po.id} className="flex justify-between items-center p-3 border border-bdr rounded-md">
                <div>
                  <p className="font-normal text-ink">{po.order.orderNumber}</p>
                  <p className="text-xs text-ink-2">{new Date(po.deadline).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <p className="font-normal text-ink tabnum">{formatRupees(Number(po.totalAmount))}</p>
                  <p className="text-xs text-ink-2">{po.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
