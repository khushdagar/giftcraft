'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatRupees } from '@/lib/utils';

function getStatusVariant(status: string): "em" | "gold" | "grey" {
  if (status === "mockup_pending") return "gold";
  if (status === "delivered" || status === "completed") return "grey";
  return "em";
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "Draft",
    quote_sent: "Quote Sent",
    confirmed: "Confirmed",
    mockup_pending: "Mockup Review",
    mockup_approved: "Approved",
    production: "In Production",
    quality_check: "QC",
    packed: "Packed",
    shipped: "Shipped",
    in_transit: "In Transit",
    delivered: "Delivered",
    completed: "Completed",
    cancelled: "Cancelled",
    refunded: "Refunded",
  };
  return labels[status] || status;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  grandTotal: number;
  createdAt: string;
  itemCount: number;
  productName?: string;
  productImage?: string | null;
}

export default function OrdersPage() {
  const [filter, setFilter] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<{ orders: Order[]; total: number }>({
    queryKey: ['orders', filter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: '1',
        limit: '50',
      });
      const res = await fetch(`/api/dashboard/orders?${params}`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    },
  });

  const orders = data?.orders || [];
  const filteredOrders = filter
    ? orders.filter((o) => {
        if (filter === 'Active') return !['delivered', 'completed', 'cancelled', 'refunded'].includes(o.status);
        if (filter === 'Mockup Review') return o.status === 'mockup_pending';
        if (filter === 'Production') return o.status === 'production';
        if (filter === 'Delivered') return o.status === 'delivered';
        return true;
      })
    : orders;

  return (
    <div className="max-w-full space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="overline text-ink-3">Orders</p>
          <h1 className="mt-1 text-3xl font-normal">Your <span className="italic text-em">history.</span></h1>
        </div>
        <Button asChild variant="em"><Link href="/builder">New Order</Link></Button>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-md-p bg-elevated p-1">
        {["All", "Active", "Mockup Review", "Production", "Delivered"].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t === "All" ? null : t)}
            className={`rounded-md-p px-4 py-1.5 text-xs font-normal transition whitespace-nowrap ${
              (t === "All" ? filter === null : filter === t)
                ? "bg-white text-ink shadow-card"
                : "text-ink-2 hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="rounded-md bg-white shadow-card">
        <div className="grid grid-cols-12 gap-3 border-b border-bdr px-5 py-3 text-[10px] font-normal uppercase tracking-wider text-ink-3">
          <div className="col-span-4">Order</div>
          <div className="col-span-3 hidden sm:block">Status</div>
          <div className="col-span-2 hidden sm:block">Amount</div>
          <div className="col-span-1"></div>
        </div>

        {isLoading ? (
          <div className="px-5 py-12 text-center text-sm text-ink-3">
            Loading orders...
          </div>
        ) : error ? (
          <div className="px-5 py-12 text-center text-sm text-red-600">
            Failed to load orders. Please try again.
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-ink-3">
            No orders found. <Link href="/builder" className="text-em font-normal">Start a new one →</Link>
          </div>
        ) : (
          filteredOrders.map((o) => (
            <Link
              key={o.id}
              href={`/dashboard/orders/${o.id}`}
              className="flex items-center gap-4 border-b border-bdr px-5 py-4 text-sm transition last:border-0 hover:bg-elevated"
            >
              {/* Product Image */}
              {o.productImage ? (
                <div className="h-14 w-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  <img src={o.productImage} alt={o.productName} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="h-14 w-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-gray-400">No image</span>
                </div>
              )}

              {/* Order Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{o.productName || 'Product'}</p>
                <p className="mt-0.5 text-xs text-ink-3">Pack × {o.itemCount || '?'}</p>
                <p className="mt-0.5 text-xs text-ink-3 tabnum">#{o.orderNumber}</p>
              </div>

              {/* Status and Price */}
              <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                <Badge variant={getStatusVariant(o.status)}>{getStatusLabel(o.status)}</Badge>
                <p className="font-normal tabnum">{formatRupees(Number(o.grandTotal))}</p>
              </div>

              <div className="text-right text-ink-3 flex-shrink-0">→</div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
