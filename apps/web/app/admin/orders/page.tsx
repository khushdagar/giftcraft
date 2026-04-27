import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { formatRupees } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function AdminOrdersPage(props: {
  searchParams: { page?: string; status?: string; search?: string };
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'super_admin') {
    redirect('/unauthorized');
  }

  const page = parseInt(props.searchParams.page || '1');
  const status = props.searchParams.status;
  const search = props.searchParams.search;
  const limit = 20;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};
  if (status) {
    where.status = status;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-em-50 text-em-700';
      case 'mockup_pending':
      case 'mockup_approved':
        return 'bg-[#FFF7ED] text-[#EA580C]';
      case 'production':
        return 'bg-sky-50 text-sky-700';
      case 'quality_check':
        return 'bg-[#F5F3FF] text-[#8B5CF6]';
      case 'packed':
        return 'bg-violet-50 text-violet-700';
      case 'shipped':
      case 'in_transit':
        return 'bg-indigo-50 text-indigo-700';
      case 'delivered':
      case 'completed':
        return 'bg-em-50 text-em-700';
      case 'cancelled':
      case 'refunded':
        return 'bg-err/10 text-err';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-ink">Orders</h1>
          <p className="text-sm text-ink-3 mt-1">Manage all customer orders</p>
        </div>
        <Link href="/admin/orders/kanban">
          <Button variant="em" className="rounded-md">
            Kanban View
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="text-xs font-semibold text-ink-3 block mb-2">Search by Order #</label>
          <form method="get" className="flex gap-2">
            <input
              type="text"
              name="search"
              placeholder="GC-2026-0001"
              defaultValue={search || ''}
              className="flex-1 px-3 py-2 rounded-md border border-bdr text-sm"
            />
            <select
              name="status"
              defaultValue={status || ''}
              className="px-3 py-2 rounded-md border border-bdr text-sm"
            >
              <option value="">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="production">Production</option>
              <option value="quality_check">Quality Check</option>
              <option value="packed">Packed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Button type="submit" variant="em" className="rounded-md">
              Search
            </Button>
          </form>
        </div>
      </div>

      {/* Table */}
      {orders.length === 0 ? (
        <div className="rounded-md border-2 border-bdr bg-white p-8 text-center">
          <p className="text-ink-3">No orders found</p>
        </div>
      ) : (
        <div className="rounded-md border-2 border-bdr bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-bdr bg-elevated/50">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-ink-3">
                  Order #
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
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-ink-2">{order._count.items} items</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-semibold text-ink tabnum">
                      {formatRupees(Number(order.grandTotal))}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-ink-2">
                      {new Date(order.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-sm font-semibold text-em hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
