'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useReducedMotion } from 'framer-motion';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';

interface Order {
  id: string;
  status: string;
  orderNumber: string;
  grandTotal: any; // Decimal from Prisma
  company: { name: string } | null;
  items: Array<{ id: string }>;
  slaLogs: Array<{
    enteredAt: Date;
    slaMinutes: number;
  }>;
}

interface KanbanBoardProps {
  initialOrders: Order[];
}

const STAGES = [
  { id: 'draft', label: 'Draft', color: 'gray' },
  { id: 'quote_sent', label: 'Quote Sent', color: 'sky' },
  { id: 'confirmed', label: 'Confirmed', color: 'indigo' },
  { id: 'mockup_pending', label: 'Design Pending', color: 'rose' },
  { id: 'mockup_approved', label: 'Design Approved', color: 'emerald' },
  { id: 'production', label: 'In Production', color: 'orange' },
  { id: 'quality_check', label: 'Quality Check', color: 'amber' },
  { id: 'packed', label: 'Packed', color: 'blue' },
  { id: 'shipped', label: 'Shipped', color: 'violet' },
  { id: 'in_transit', label: 'In Transit', color: 'teal' },
  { id: 'delivered', label: 'Delivered', color: 'em' },
  { id: 'completed', label: 'Completed', color: 'green' },
  { id: 'cancelled', label: 'Cancelled', color: 'gray' },
  { id: 'refunded', label: 'Refunded', color: 'gray' },
];

export function KanbanBoard({ initialOrders }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const queryClient = useQueryClient();

  // Fetch orders (with initial data)
  const { data: orders = initialOrders } = useQuery({
    queryKey: ['admin-orders-kanban'],
    queryFn: async () => {
      const res = await fetch('/api/admin/orders?include=slaLogs');
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      return data.orders;
    },
    initialData: initialOrders,
    staleTime: 30000, // 30 seconds
  });

  // Mutation for updating order status
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      newStatus,
    }: {
      orderId: string;
      newStatus: string;
    }) => {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin-orders-kanban'],
      });
    },
  });

  // Group orders by status
  const groupedOrders = useMemo(() => {
    const groups: Record<string, Order[]> = {};
    STAGES.forEach((stage) => {
      groups[stage.id] = [];
    });
    orders.forEach((order: Order) => {
      if (groups[order.status as keyof typeof groups]) {
        groups[order.status as keyof typeof groups]!.push(order);
      }
    });
    return groups;
  }, [orders]);

  // Find active order for overlay
  const activeOrder = useMemo(() => {
    if (!activeId) return null;
    return orders.find((o: Order) => o.id === activeId);
  }, [activeId, orders]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const overId = over.id as string;
    if (STAGES.find((s) => s.id === overId)) {
      // Dropped over a column (stage)
      const newStatus = overId;
      updateStatusMutation.mutate({
        orderId: active.id as string,
        newStatus,
      });
    }
  };

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={(event) => setActiveId(event.active.id as string)}
      onDragEnd={handleDragEnd}
    >
      {/* Horizontal scrolling container */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max pr-4">
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage.id}
              status={stage.id}
              label={stage.label}
              orders={groupedOrders[stage.id] || []}
              color={stage.color}
            />
          ))}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeOrder ? <KanbanCard order={activeOrder} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
