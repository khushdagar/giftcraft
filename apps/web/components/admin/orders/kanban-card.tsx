'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { SLABadge } from './sla-badge';
import { formatRupees } from '@/lib/utils';

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

interface KanbanCardProps {
  order: Order;
}

export function KanbanCard({ order }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Get current SLA log if exists
  const currentSla = order.slaLogs?.[0];

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.08)' }}
      className="bg-surface border border-bdr rounded-md p-4 cursor-move touch-none"
    >
      <Link href={`/admin/orders/${order.id}`} className="block group">
        {/* Order Number */}
        <h3 className="font-bold text-sm text-ink group-hover:text-em transition-colors">
          {order.orderNumber}
        </h3>

        {/* Company Name */}
        <p className="text-xs text-ink-2 mt-1 truncate">
          {order.company?.name || 'No company'}
        </p>

        {/* Item Count */}
        <p className="text-xs text-ink-2 mt-1">
          {order.items.length} product{order.items.length !== 1 ? 's' : ''}
        </p>

        {/* Amount */}
        <p className="font-bold text-base text-ink mt-2">
          {formatRupees(order.grandTotal)}
        </p>

        {/* SLA Badge */}
        {currentSla && (
          <div className="mt-3 flex justify-start">
            <SLABadge
              enteredAt={new Date(currentSla.enteredAt)}
              slaMinutes={currentSla.slaMinutes}
            />
          </div>
        )}
      </Link>
    </motion.div>
  );
}
