import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { OrdersTable, type OrderRow } from './orders-table';
import { OrdersSearch } from './orders-search';

export default async function AdminOrdersPage(props: {
  searchParams: { page?: string; status?: string; search?: string; placedBy?: string };
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'super_admin') {
    redirect('/unauthorized');
  }

  const page = parseInt(props.searchParams.page || '1');
  const status = props.searchParams.status;
  const search = props.searchParams.search;
  const placedBy = props.searchParams.placedBy;
  const limit = 20;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};
  if (status) {
    where.status = status;
  }
  if (placedBy) {
    where.placedById = placedBy;
  }
  if (search) {
    where.orderNumber = {
      contains: search,
      mode: 'insensitive',
    };
  }

  // Fetch orders
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        grandTotal: true,
        createdAt: true,
        billingJson: true,
        _count: {
          select: { items: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.order.count({ where }),
  ]);

  const pages = Math.ceil(total / limit);

  // Shape rows for the table: pull the customer + a derived payment status out
  // of billingJson so the list reads like a Shopify orders screen.
  const rows: OrderRow[] = orders.map((order) => {
    const billing = (order.billingJson as any) || {};
    const total = Number(order.grandTotal);
    const amountPaid = Number(billing.amountPaid ?? 0);

    let payment: OrderRow['payment'];
    if (order.status === 'refunded') payment = 'Refunded';
    else if (amountPaid >= total && total > 0) payment = 'Paid';
    else if (amountPaid > 0) payment = 'Partial';
    else payment = 'Unpaid';

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total,
      createdAt: new Date(order.createdAt).toISOString(),
      itemCount: order._count.items,
      customer: billing.companyName || billing.email || '—',
      payment,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-normal text-ink">Orders</h1>
          <p className="text-sm text-ink-3 mt-1">Manage all customer orders</p>
        </div>
        <Link href="/admin/orders/kanban">
          <Button variant="em" className="rounded-md">
            Kanban View
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <form method="get" className="flex flex-wrap items-center gap-2">
        <OrdersSearch defaultValue={search || ''} />
        <select
          name="status"
          defaultValue={status || ''}
          className="h-9 rounded-md border border-bdr px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="mockup_pending">Mockup Pending</option>
          <option value="production">Production</option>
          <option value="quality_check">Quality Check</option>
          <option value="packed">Packed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
        <Button type="submit" variant="em" className="h-9 rounded-md">
          Search
        </Button>
      </form>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="rounded-md border border-bdr bg-white p-10 text-center">
          <p className="text-ink-3">No orders found</p>
        </div>
      ) : (
        <OrdersTable orders={rows} />
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex gap-3 justify-center items-center">
          {page > 1 && (
            <Link href={`/admin/orders?page=${page - 1}${status ? `&status=${status}` : ''}`}>
              <Button variant="outline" className="rounded-md">
                Previous
              </Button>
            </Link>
          )}
          <span className="text-sm text-ink-2">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link href={`/admin/orders?page=${page + 1}${status ? `&status=${status}` : ''}`}>
              <Button variant="em" className="rounded-md">
                Next
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
