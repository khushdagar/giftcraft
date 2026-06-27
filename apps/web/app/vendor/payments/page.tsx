import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { formatRupees } from '@/lib/utils';
import { DollarSign, CheckCircle } from 'lucide-react';

export const metadata = {
  title: 'Payments - GiftCraft Vendor',
  description: 'View payment history',
};

export default async function VendorPaymentsPage() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== 'vendor') {
    redirect('/unauthorized');
  }

  const vendor = await prisma.vendor.findFirst({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      payments: {
        select: {
          id: true,
          invoiceNumber: true,
          amount: true,
          dueDate: true,
          status: true,
          createdAt: true,
        },
        orderBy: { dueDate: 'desc' },
      },
    },
  });

  if (!vendor) redirect('/unauthorized');

  const totalPayments = vendor.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingPayments = vendor.payments.filter((p) => p.status === 'pending');
  const totalPending = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      overdue: 'bg-red-50 text-red-700 border-red-200',
      cancelled: 'bg-gray-50 text-gray-700 border-gray-200',
    };
    return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-normal text-ink">Payments</h1>
        <p className="text-sm text-ink-2 mt-1">
          Total: {vendor.payments.length} payment{vendor.payments.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-md border-2 border-bdr bg-white p-4">
          <p className="text-xs font-normal uppercase tracking-wider text-ink-3">Total Amount</p>
          <p className="text-2xl font-normal text-ink mt-2 tabnum">{formatRupees(totalPayments)}</p>
        </div>

        <div className="rounded-md border-2 border-bdr bg-white p-4">
          <p className="text-xs font-normal uppercase tracking-wider text-ink-3">Pending</p>
          <p className="text-2xl font-normal text-amber-600 mt-2 tabnum">{formatRupees(totalPending)}</p>
          <p className="text-xs text-ink-2 mt-1">{pendingPayments.length} invoice(s)</p>
        </div>

        <div className="rounded-md border-2 border-bdr bg-white p-4">
          <p className="text-xs font-normal uppercase tracking-wider text-ink-3">Paid</p>
          <p className="text-2xl font-normal text-emerald-600 mt-2">
            {vendor.payments.filter((p) => p.status === 'paid').length}
          </p>
          <p className="text-xs text-ink-2 mt-1">Invoices</p>
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-md border-2 border-bdr overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b-2 border-bdr">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Invoice</th>
              <th className="px-6 py-4 text-right text-xs font-normal text-ink-2 uppercase">Amount</th>
              <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Due Date</th>
              <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bdr">
            {vendor.payments.map((payment) => (
              <tr key={payment.id} className="bg-white hover:bg-gray-50 transition">
                <td className="px-6 py-4 text-sm font-normal text-ink">{payment.invoiceNumber}</td>
                <td className="px-6 py-4 text-sm text-right font-normal text-ink tabnum">
                  {formatRupees(Number(payment.amount))}
                </td>
                <td className="px-6 py-4 text-sm text-ink-2">
                  {new Date(payment.dueDate).toLocaleDateString('en-IN')}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-normal px-3 py-1 rounded-full border-2 ${getStatusColor(payment.status)}`}>
                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {vendor.payments.length === 0 && (
        <div className="rounded-md border-2 border-bdr bg-white p-12 text-center">
          <DollarSign className="w-12 h-12 text-ink-3 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-normal text-ink mb-2">No Payments</h3>
          <p className="text-sm text-ink-2">You haven't received any payments yet.</p>
        </div>
      )}
    </div>
  );
}
