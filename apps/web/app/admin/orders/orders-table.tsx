'use client';

import { useRouter } from 'next/navigation';
import { formatRupees } from '@/lib/utils';

export interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string; // ISO
  itemCount: number;
  customer: string;
  payment: 'Paid' | 'Partial' | 'Unpaid' | 'Refunded';
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: 'bg-em-50 text-em-700',
  mockup_pending: 'bg-[#FFF7ED] text-[#EA580C]',
  mockup_approved: 'bg-[#FFF7ED] text-[#EA580C]',
  production: 'bg-sky-50 text-sky-700',
  quality_check: 'bg-[#F5F3FF] text-[#8B5CF6]',
  packed: 'bg-violet-50 text-violet-700',
  shipped: 'bg-indigo-50 text-indigo-700',
  in_transit: 'bg-indigo-50 text-indigo-700',
  delivered: 'bg-em-50 text-em-700',
  completed: 'bg-em-50 text-em-700',
  cancelled: 'bg-err/10 text-err',
  refunded: 'bg-err/10 text-err',
};

const PAYMENT_STYLE: Record<OrderRow['payment'], string> = {
  Paid: 'bg-em-50 text-em-700',
  Partial: 'bg-amber-50 text-amber-700',
  Unpaid: 'bg-gray-100 text-gray-600',
  Refunded: 'bg-gray-100 text-gray-500',
};

function statusLabel(status: string) {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// "Jul 1 at 4:26 pm"
function formatDate(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase();
  return `${date} at ${time}`;
}

const Dot = ({ className }: { className: string }) => (
  <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${className}`} />
);

const PAYMENT_DOT: Record<OrderRow['payment'], string> = {
  Paid: 'bg-em',
  Partial: 'bg-amber-500',
  Unpaid: 'bg-gray-400',
  Refunded: 'bg-gray-400',
};

export function OrdersTable({ orders }: { orders: OrderRow[] }) {
  const router = useRouter();

  return (
    <div className="overflow-hidden rounded-md border border-bdr bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-bdr bg-elevated/40 text-xs text-ink-3">
              <th className="px-4 py-3 text-left font-medium">Order</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Customer</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-left font-medium">Payment</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Items</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                onClick={() => router.push(`/admin/orders/${o.id}`)}
                className="cursor-pointer border-b border-bdr last:border-0 hover:bg-elevated/40"
              >
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="font-semibold text-ink">#{o.orderNumber}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-2">{formatDate(o.createdAt)}</td>
                <td className="max-w-[220px] truncate px-4 py-3 text-ink-2">{o.customer}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabnum text-ink">
                  {formatRupees(o.total)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_STYLE[o.payment]}`}
                  >
                    <Dot className={PAYMENT_DOT[o.payment]} />
                    {o.payment}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_STYLE[o.status] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {statusLabel(o.status)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-ink-2">
                  {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
