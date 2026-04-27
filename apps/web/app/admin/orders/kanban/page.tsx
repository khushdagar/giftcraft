import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { KanbanBoard } from '@/components/admin/orders/kanban-board';
import { ChevronLeft } from 'lucide-react';

export default async function AdminOrdersKanbanPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'super_admin') {
    redirect('/unauthorized');
  }

  // Fetch all non-terminal orders with SLA data
  const ordersRaw = await prisma.order.findMany({
    where: {
      status: {
        notIn: ['completed', 'cancelled', 'refunded'],
      },
    },
    select: {
      id: true,
      status: true,
      orderNumber: true,
      grandTotal: true,
      company: {
        select: { name: true },
      },
      items: {
        select: { id: true },
      },
      slaLogs: {
        where: { exitedAt: null },
        select: {
          enteredAt: true,
          slaMinutes: true,
        },
        take: 1,
        orderBy: { enteredAt: 'desc' },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const orders = ordersRaw;

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/admin/orders" className="text-em hover:text-em-700">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-black text-ink">Kanban Board</h1>
          </div>
          <p className="text-sm text-ink-3">
            Visualize and manage all orders across 12 stages. Drag cards to update status.
          </p>
        </div>
        <Link href="/admin/orders">
          <Button variant="outline" className="rounded-md">
            List View
          </Button>
        </Link>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden border-2 border-bdr rounded-md bg-white p-4">
        <KanbanBoard initialOrders={orders} />
      </div>
    </div>
  );
}
