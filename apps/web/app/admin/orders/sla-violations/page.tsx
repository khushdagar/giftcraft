import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ExternalLink } from 'lucide-react';

export const metadata = {
  title: 'SLA Violations - GiftCraft Admin',
  description: 'Orders with breached SLAs',
};

interface SearchParams {
  page?: string;
  limit?: string;
  status?: string;
}

export default async function SlaViolationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session || session.user?.role !== 'super_admin') {
    redirect('/unauthorized');
  }

  const page = parseInt(searchParams.page || '1', 10);
  const limit = parseInt(searchParams.limit || '20', 10);
  const status = searchParams.status;

  // Fetch violations
  const violations = await prisma.orderSlaLog.findMany({
    where: {
      isBreached: true,
    },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          grandTotal: true,
          createdAt: true,
          company: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { enteredAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  const total = await prisma.orderSlaLog.count({
    where: { isBreached: true },
  });

  const totalPages = Math.ceil(total / limit);

  function formatMinutes(minutes: number): string {
    if (minutes < 0) return 'N/A';
    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = Math.floor(minutes % 60);

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  }

  const enriched = violations.map((log) => {
    const now = new Date();
    const elapsedMinutes = log.exitedAt
      ? (log.exitedAt.getTime() - log.enteredAt.getTime()) / (1000 * 60)
      : (now.getTime() - log.enteredAt.getTime()) / (1000 * 60);

    return {
      ...log,
      elapsedMinutes: Math.round(elapsedMinutes),
      breachedByMinutes: Math.round(elapsedMinutes - log.slaMinutes),
      breachedByFormatted: formatMinutes(Math.round(elapsedMinutes - log.slaMinutes)),
    };
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-normal text-ink">SLA Violations</h1>
        <p className="text-sm text-ink-2 mt-1">
          {total} order{total !== 1 ? 's' : ''} with breached SLAs
        </p>
      </div>

      {/* Empty State */}
      {enriched.length === 0 ? (
        <div className="bg-emerald-50 rounded-md border-2 border-em-200 p-12 text-center">
          <AlertCircle className="w-12 h-12 text-em mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-normal text-em-700 mb-2">No Violations Found</h3>
          <p className="text-em-600">All orders are meeting their SLA targets 🎉</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto rounded-md border-2 border-bdr">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-bdr">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-normal text-ink-2 uppercase">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-ink-2 uppercase">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-ink-2 uppercase">
                    Stage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-ink-2 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-ink-2 uppercase">
                    Time Spent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-ink-2 uppercase">
                    SLA Target
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-ink-2 uppercase">
                    Breached By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-ink-2 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bdr">
                {enriched.map((log, idx) => (
                  <tr
                    key={log.id}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    <td className="px-6 py-4 text-sm font-normal text-ink">
                      {log.order.orderNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-2">
                      {log.order.company?.name || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-2">{log.stage}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-normal ${
                          log.order.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {log.order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-normal text-ink">
                      {log.elapsedMinutes}m
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-2">{log.slaMinutes}m</td>
                    <td className="px-6 py-4 text-sm font-normal text-rose-600">
                      +{log.breachedByFormatted}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Link
                        href={`/admin/orders/${log.orderId}`}
                        className="inline-flex items-center gap-1 text-navy-800 hover:text-navy-900 font-normal"
                      >
                        Review <ExternalLink className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-2">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`?page=${page - 1}&limit=${limit}`}
                    className="px-4 py-2 rounded-md border-2 border-bdr hover:bg-gray-50 font-normal text-sm"
                  >
                    ← Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`?page=${page + 1}&limit=${limit}`}
                    className="px-4 py-2 rounded-md border-2 border-bdr hover:bg-gray-50 font-normal text-sm"
                  >
                    Next →
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
