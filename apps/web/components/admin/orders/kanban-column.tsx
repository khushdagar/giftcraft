'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { KanbanCard } from './kanban-card';

interface Order {
  id: string;
  orderNumber: string;
  grandTotal: number;
  company: { name: string } | null;
  items: Array<{ id: string }>;
  slaLogs: Array<{
    enteredAt: Date;
    slaMinutes: number;
  }>;
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-700' },
  sky: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', badge: 'bg-sky-100 text-sky-700' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-700' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', badge: 'bg-teal-100 text-teal-700' },
  em: { bg: 'bg-em-50', border: 'border-em-200', text: 'text-em-700', badge: 'bg-em-100 text-em-700' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
};

interface KanbanColumnProps {
  status: string;
  label: string;
  orders: Order[];
  color: keyof typeof COLOR_MAP;
}

const STAGE_DESCRIPTIONS: Record<string, string> = {
  draft: 'Order created, awaiting confirmation',
  quote_sent: 'Quote sent to customer',
  confirmed: 'Order confirmed',
  mockup_pending: 'Awaiting design approval',
  mockup_approved: 'Design approved',
  production: 'In production',
  quality_check: 'Quality check in progress',
  packed: 'Ready to ship',
  shipped: 'Shipped',
  in_transit: 'In transit to customer',
  delivered: 'Delivered',
  completed: 'Order complete',
  cancelled: 'Order cancelled',
  refunded: 'Refunded',
};

export function KanbanColumn({
  status,
  label,
  orders,
  color,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  const colors = COLOR_MAP[color] ?? COLOR_MAP.gray;

  return (
    <div className="flex flex-col w-80 flex-shrink-0">
      {/* Column Header */}
      <div className={`${colors?.bg} border-2 ${colors?.border} rounded-md p-3 mb-3`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-bold text-ink truncate">{label}</h3>
            <p className="text-xs text-ink-2 mt-0.5">
              {STAGE_DESCRIPTIONS[status] || status}
            </p>
          </div>
          <div className={`ml-2 ${colors?.badge} rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap`}>
            {orders.length}
          </div>
        </div>
      </div>

      {/* Cards Container */}
      <div
        ref={setNodeRef}
        className="flex-1 space-y-2 min-h-96 bg-gray-50 rounded-md p-2 border-2 border-dashed border-gray-200"
      >
        <SortableContext
          items={orders.map((o) => o.id)}
          strategy={verticalListSortingStrategy}
        >
          {orders.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400">
              <p className="text-sm text-center">No orders</p>
            </div>
          ) : (
            orders.map((order) => (
              <KanbanCard key={order.id} order={order} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
