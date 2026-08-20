import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

const ACTION_STYLE: Record<string, string> = {
  create: 'bg-emerald-50 text-emerald-700',
  createMany: 'bg-emerald-50 text-emerald-700',
  update: 'bg-sky-50 text-sky-700',
  updateMany: 'bg-sky-50 text-sky-700',
  delete: 'bg-rose-50 text-rose-700',
  deleteMany: 'bg-rose-50 text-rose-700',
};

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

/** Render `changes` as old → new rows when it is a diff, else as raw JSON. */
function ChangeList({ changes }: { changes: Prisma.JsonValue }) {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
    return <p className="text-xs text-ink-3">{fmt(changes)}</p>;
  }
  const entries = Object.entries(changes as Record<string, unknown>);
  if (entries.length === 0) return <p className="text-xs text-ink-3">No field changed.</p>;

  const isDiff = entries.every(
    ([, v]) => v && typeof v === 'object' && !Array.isArray(v) && 'to' in (v as object)
  );

  return (
    <table className="w-full text-xs">
      <tbody>
        {entries.map(([field, value]) => (
          <tr key={field} className="align-top">
            <td className="w-40 py-1 pr-3 font-normal text-ink">{field}</td>
            {isDiff ? (
              <>
                <td className="py-1 pr-3 text-rose-700 line-through break-all">
                  {fmt((value as { from: unknown }).from)}
                </td>
                <td className="py-1 text-emerald-700 break-all">
                  {fmt((value as { to: unknown }).to)}
                </td>
              </>
            ) : (
              <td className="py-1 text-ink-2 break-all" colSpan={2}>
                {fmt(value)}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type SearchParams = {
  actor?: string;
  entity?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: string;
};

// Audit trail: who (name + email) changed what, and when. Rows are written
// automatically by the Prisma extension in lib/audit.ts for every write made
// through an /api/admin/* request.
export default async function AdminLogsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'super_admin') {
    redirect('/unauthorized');
  }

  const page = Math.max(1, Number(searchParams.page) || 1);
  const actor = searchParams.actor?.trim() || '';
  const entity = searchParams.entity?.trim() || '';
  const action = searchParams.action?.trim() || '';
  const from = searchParams.from?.trim() || '';
  const to = searchParams.to?.trim() || '';

  const where: Prisma.AdminActivityLogWhereInput = {
    ...(actor
      ? {
          OR: [
            { actorEmail: { contains: actor, mode: 'insensitive' } },
            { actorName: { contains: actor, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(entity ? { entity } : {}),
    ...(action ? { action } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
            // `to` is inclusive of the whole day.
            ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}),
          },
        }
      : {}),
  };

  const [logs, total, entities] = await Promise.all([
    prisma.adminActivityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.adminActivityLog.count({ where }),
    prisma.adminActivityLog.groupBy({ by: ['entity'], orderBy: { entity: 'asc' } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (next: Partial<SearchParams>) => {
    const params = new URLSearchParams();
    const merged = { actor, entity, action, from, to, page: String(page), ...next };
    for (const [k, v] of Object.entries(merged)) if (v && v !== '1') params.set(k, String(v));
    const s = params.toString();
    return s ? `/admin/logs?${s}` : '/admin/logs';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-normal text-ink">Activity Log</h1>
        <p className="mt-1 text-sm text-ink-3">
          Every change made from the admin dashboard — who made it, what they
          changed, and when. {total.toLocaleString('en-IN')} entries.
        </p>
      </div>

      {/* Filters */}
      <form className="rounded-md border-2 border-bdr bg-white p-4" method="get">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className="mb-1 block text-xs font-normal text-ink-3">Admin (name or email)</span>
            <input
              name="actor"
              defaultValue={actor}
              placeholder="e.g. someone@givoo.in"
              className="h-9 w-full rounded-md border border-bdr px-3 text-sm text-ink placeholder:text-ink-3"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-normal text-ink-3">Section</span>
            <select
              name="entity"
              defaultValue={entity}
              className="h-9 w-full rounded-md border border-bdr px-3 text-sm text-ink"
            >
              <option value="">All</option>
              {entities.map((e) => (
                <option key={e.entity} value={e.entity}>
                  {e.entity}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-normal text-ink-3">Action</span>
            <select
              name="action"
              defaultValue={action}
              className="h-9 w-full rounded-md border border-bdr px-3 text-sm text-ink"
            >
              <option value="">All</option>
              <option value="create">Created</option>
              <option value="update">Updated</option>
              <option value="delete">Deleted</option>
              <option value="createMany">Bulk create</option>
              <option value="updateMany">Bulk update</option>
              <option value="deleteMany">Bulk delete</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-normal text-ink-3">From</span>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="h-9 w-full rounded-md border border-bdr px-3 text-sm text-ink"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-normal text-ink-3">To</span>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="h-9 w-full rounded-md border border-bdr px-3 text-sm text-ink"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            className="h-9 rounded-md bg-ink px-4 text-sm font-normal text-white"
          >
            Apply
          </button>
          <Link href="/admin/logs" className="text-sm text-ink-3 hover:text-ink">
            Reset
          </Link>
        </div>
      </form>

      <div className="rounded-md border-2 border-bdr bg-white p-5">
        {logs.length === 0 ? (
          <p className="text-sm text-ink-3">
            No activity recorded for these filters yet. Changes made from the
            admin dashboard will appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bdr">
                  <th className="py-2 pr-4 text-left font-normal text-ink">When</th>
                  <th className="py-2 pr-4 text-left font-normal text-ink">Admin</th>
                  <th className="py-2 pr-4 text-left font-normal text-ink">Action</th>
                  <th className="py-2 pr-4 text-left font-normal text-ink">Record</th>
                  <th className="py-2 text-left font-normal text-ink">What changed</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-bdr align-top last:border-0">
                    <td className="whitespace-nowrap py-3 pr-4 text-ink-2">
                      {log.createdAt.toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                        timeZone: 'Asia/Kolkata',
                      })}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-normal text-ink">{log.actorName || 'Unknown'}</div>
                      <div className="text-xs text-ink-3">{log.actorEmail || '—'}</div>
                      <div className="text-xs text-ink-3">{log.actorRole || '—'}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-normal ${
                          ACTION_STYLE[log.action] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-normal text-ink">{log.entity}</div>
                      <div className="text-xs text-ink-3">{log.entityLabel || log.entityId || '—'}</div>
                    </td>
                    <td className="py-3">
                      <details>
                        <summary className="cursor-pointer text-xs text-ink-3 hover:text-ink">
                          View details
                        </summary>
                        <div className="mt-2 max-w-2xl rounded-md bg-gray-50 p-3">
                          <ChangeList changes={log.changes} />
                          <p className="mt-2 text-xs text-ink-3">
                            {log.method} {log.path}
                          </p>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-ink-3">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={qs({ page: String(page - 1) })}
                  className="rounded-md border border-bdr px-3 py-1.5 text-ink-2 hover:text-ink"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={qs({ page: String(page + 1) })}
                  className="rounded-md border border-bdr px-3 py-1.5 text-ink-2 hover:text-ink"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
