import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { formatRupees } from '@/lib/utils';
import Link from 'next/link';
import { Package, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';

export const metadata = {
  title: 'Vendor Dashboard - GiftCraft',
  description: 'Manage your purchase orders and payments',
};

export default async function VendorDashboardPage() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== 'vendor') {
    redirect('/unauthorized');
  }

  // Fetch vendor data
  const vendor = await prisma.vendor.findFirst({
    where: {
      // In production, link user to vendor via User model
      // For now, use email matching
      email: session.user.email,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      vendorScore: {
        select: {
          qualityScore: true,
          onTimeScore: true,
          reliabilityScore: true,
        },
      },
      pos: {
        where: { status: { in: ['pending', 'in_progress'] } },
        select: {
          id: true,
          orderId: true,
          status: true,
          deadline: true,
          totalAmount: true,
          order: {
            select: {
              orderNumber: true,
              packQuantity: true,
            },
          },
        },
        orderBy: { deadline: 'asc' },
        take: 5,
      },
      payments: {
        where: { status: 'pending' },
        select: {
          id: true,
          invoiceNumber: true,
          amount: true,
          dueDate: true,
          status: true,
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
      },
    },
  });

  if (!vendor) {
    redirect('/unauthorized');
  }

  const avgScore = vendor.vendorScore
    ? Math.round(
        (vendor.vendorScore.qualityScore +
          vendor.vendorScore.onTimeScore +
          vendor.vendorScore.reliabilityScore) /
          3
      )
    : 0;

  const activePOs = vendor.pos.length;
  const pendingPayments = vendor.payments.length;
  const totalPaymentDue = vendor.payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-normal text-ink">Vendor Dashboard</h1>
        <p className="text-sm text-ink-2 mt-1">
          Welcome back, {vendor.name}. Here's what's happening with your orders.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-md border-2 border-bdr bg-white p-4">
          <p className="text-xs font-normal uppercase tracking-wider text-ink-3">Active POs</p>
          <p className="text-2xl font-normal text-ink mt-2">{activePOs}</p>
          <p className="text-xs text-ink-2 mt-1">Pending completion</p>
        </div>

        <div className="rounded-md border-2 border-bdr bg-white p-4">
          <p className="text-xs font-normal uppercase tracking-wider text-ink-3">Pending Payments</p>
          <p className="text-2xl font-normal text-ink mt-2">{pendingPayments}</p>
          <p className="text-xs text-ink-2 mt-1">Total: {formatRupees(totalPaymentDue)}</p>
        </div>

        <div className="rounded-md border-2 border-bdr bg-white p-4">
          <p className="text-xs font-normal uppercase tracking-wider text-ink-3">Vendor Score</p>
          <p className="text-2xl font-normal text-em mt-2">{avgScore}/100</p>
          <p className="text-xs text-ink-2 mt-1">Overall performance</p>
        </div>

        <div className="rounded-md border-2 border-bdr bg-white p-4">
          <p className="text-xs font-normal uppercase tracking-wider text-ink-3">Contact</p>
          <p className="text-sm font-normal text-ink mt-2">{vendor.phone}</p>
          <p className="text-xs text-ink-2 mt-1 break-all">{vendor.email}</p>
        </div>
      </div>

      {/* Active POs Section */}
      <div className="rounded-md border-2 border-bdr bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-normal text-ink flex items-center gap-2">
            <Package className="w-5 h-5 text-em" />
            Active Purchase Orders
          </h2>
          <Link href="/vendor/po" className="text-em font-normal hover:underline text-sm">
            View all
          </Link>
        </div>

        {activePOs === 0 ? (
          <p className="text-sm text-ink-2 text-center py-8">No active purchase orders</p>
        ) : (
          <div className="space-y-3">
            {vendor.pos.map((po) => (
              <Link
                key={po.id}
                href={`/vendor/po/${po.id}`}
                className="flex items-center justify-between p-4 rounded-md border border-bdr hover:bg-gray-50 transition"
              >
                <div className="flex-1">
                  <p className="font-normal text-ink">{po.order.orderNumber}</p>
                  <p className="text-xs text-ink-2">
                    Qty: {po.order.packQuantity} • Due:{' '}
                    {new Date(po.deadline).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-normal text-ink tabnum">
                    {formatRupees(Number(po.totalAmount))}
                  </p>
                  <span className={`text-xs font-normal px-2 py-1 rounded-full ${
                    po.status === 'pending'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {po.status === 'pending' ? 'Pending' : 'In Progress'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Pending Payments Section */}
      <div className="rounded-md border-2 border-bdr bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-normal text-ink flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-em" />
            Pending Payments
          </h2>
          <Link href="/vendor/payments" className="text-em font-normal hover:underline text-sm">
            View all
          </Link>
        </div>

        {pendingPayments === 0 ? (
          <div className="flex items-center justify-center py-8 text-emerald-600">
            <CheckCircle className="w-5 h-5 mr-2" />
            <p className="text-sm font-normal">All payments are up to date</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vendor.payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 rounded-md border border-bdr"
              >
                <div className="flex-1">
                  <p className="font-normal text-ink">{payment.invoiceNumber}</p>
                  <p className="text-xs text-ink-2">
                    Due: {new Date(payment.dueDate).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-normal text-ink tabnum">
                    {formatRupees(Number(payment.amount))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
