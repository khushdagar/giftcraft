'use client';

import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { formatRupees } from '@/lib/utils';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  grandTotal: number | null;
  createdAt: Date;
  items: { id: string }[];
}

interface DashboardContentProps {
  userId: string;
  initialOrders: Order[];
}

export function DashboardContent({ userId, initialOrders }: DashboardContentProps) {
  const [orders] = useState(initialOrders);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-em-50 text-em-700';
      case 'in_production':
        return 'bg-sky-50 text-sky-700';
      case 'qc':
        return 'bg-[#FFF7ED] text-[#EA580C]';
      case 'packed':
        return 'bg-[#F5F3FF] text-[#8B5CF6]';
      case 'dispatched':
        return 'bg-[#FFF1F2] text-[#F43F5E]';
      case 'delivered':
        return 'bg-em-50 text-em-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      confirmed: 'Confirmed',
      in_production: 'In Production',
      qc: 'QC',
      packed: 'Packed',
      dispatched: 'Dispatched',
      delivered: 'Delivered',
    };
    return labels[status] || status;
  };

  return (
    <Tabs.Root defaultValue="orders" className="w-full">
      <Tabs.List className="flex border-b border-bdr gap-1 mb-6">
        <Tabs.Trigger
          value="orders"
          className="px-4 py-3 text-sm font-semibold text-ink-3 hover:text-ink transition border-b-2 border-transparent data-[state=active]:border-em data-[state=active]:text-ink data-[state=active]:bg-em-50/30"
        >
          Orders
        </Tabs.Trigger>
        <Tabs.Trigger
          value="quotes"
          className="px-4 py-3 text-sm font-semibold text-ink-3 hover:text-ink transition border-b-2 border-transparent data-[state=active]:border-em data-[state=active]:text-ink data-[state=active]:bg-em-50/30"
        >
          Quotes
        </Tabs.Trigger>
        <Tabs.Trigger
          value="assets"
          className="px-4 py-3 text-sm font-semibold text-ink-3 hover:text-ink transition border-b-2 border-transparent data-[state=active]:border-em data-[state=active]:text-ink data-[state=active]:bg-em-50/30"
        >
          Brand Assets
        </Tabs.Trigger>
        <Tabs.Trigger
          value="profile"
          className="px-4 py-3 text-sm font-semibold text-ink-3 hover:text-ink transition border-b-2 border-transparent data-[state=active]:border-em data-[state=active]:text-ink data-[state=active]:bg-em-50/30"
        >
          Profile
        </Tabs.Trigger>
      </Tabs.List>

      {/* Orders Tab */}
      <Tabs.Content value="orders" className="animate-in fade-in">
        {orders.length === 0 ? (
          <div className="rounded-md border-2 border-bdr bg-white p-8 text-center">
            <p className="text-ink-3 mb-4">No orders yet</p>
            <a
              href="/builder"
              className="inline-block rounded-md bg-em text-white px-6 py-2 text-sm font-semibold hover:bg-em-800 transition"
            >
              Create Your First Pack
            </a>
          </div>
        ) : (
          <div className="rounded-md border-2 border-bdr bg-white overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-bdr bg-elevated/50">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-ink-3">
                    Order Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-ink-3">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-ink-3">
                    Items
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-ink-3">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-ink-3">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-ink-3">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-bdr hover:bg-elevated/30 transition">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-ink">{order.orderNumber}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(
                          order.status
                        )}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-ink-2">{order.items.length} items</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-semibold text-ink tabnum">
                        {formatRupees(Number(order.grandTotal) || 0)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-ink-2">
                        {new Date(order.createdAt).toLocaleDateString('en-IN')}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={`/orders/${order.id}/track`}
                        className="text-sm font-semibold text-em hover:underline"
                      >
                        Track
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tabs.Content>

      {/* Quotes Tab */}
      {/* <Tabs.Content value="quotes" className="animate-in fade-in">
        <div className="rounded-md border-2 border-bdr bg-white p-8 text-center">
          <p className="text-ink-3 mb-4">No active quotes yet</p>
          <a
            href="/builder"
            className="inline-block rounded-md bg-em text-white px-6 py-2 text-sm font-semibold hover:bg-em-800 transition"
          >
            Create a Quote
          </a>
        </div>
      </Tabs.Content> */}

      {/* Brand Assets Tab */}
      <Tabs.Content value="assets" className="animate-in fade-in">
        <div className="rounded-md border-2 border-bdr bg-white p-8 text-center">
          <p className="text-ink-3 mb-4">Brand assets feature coming soon</p>
          <p className="text-xs text-ink-3">Save your logos, colors, and design guidelines here</p>
        </div>
      </Tabs.Content>

      {/* Profile Tab */}
      <Tabs.Content value="profile" className="animate-in fade-in">
        <div className="rounded-md border-2 border-bdr bg-white p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-4">
            Account Information
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-ink-3 block mb-1">Email</label>
              <p className="text-sm text-ink">{userId}</p>
            </div>
            <p className="text-xs text-ink-2 border-t border-bdr pt-4">
              Your account is managed via Google. Sign out and sign back in with a different Google account to switch.
            </p>
          </div>
        </div>
      </Tabs.Content>
    </Tabs.Root>
  );
}
