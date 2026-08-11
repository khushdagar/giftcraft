import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatRupees } from '@/lib/utils';
import { Plus, ExternalLink } from 'lucide-react';

export const revalidate = 0;

export default async function AdminProposalsPage() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const proposals = await prisma.proposal.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      quote: { select: { shareToken: true, status: true, payload: true } },
      packs: {
        orderBy: { sortOrder: 'asc' },
        select: { id: true, label: true, quote: { select: { shareToken: true, payload: true } } },
      },
    },
  });

  const rows = proposals.map((p) => {
    const primary = p.quote.payload as any;
    // Proposals created before multi-pack existed have no pack rows — show the
    // primary quote as the single option.
    const packs =
      p.packs.length > 0
        ? p.packs.map((pk) => {
            const pl = pk.quote.payload as any;
            return {
              id: pk.id,
              label: pk.label,
              token: pk.quote.shareToken,
              total: Number(pl?.pricing?.grandTotal) || 0,
              qty: Number(pl?.packQuantity) || 0,
            };
          })
        : [
            {
              id: p.id,
              label: 'Pack 1',
              token: p.quote.shareToken,
              total: Number(primary?.pricing?.grandTotal) || 0,
              qty: Number(primary?.packQuantity) || 0,
            },
          ];
    return {
      id: p.id,
      recipient: p.recipientName || p.recipientEmail,
      email: p.recipientEmail,
      company: p.companyName,
      createdAt: p.createdAt,
      status: p.quote.status,
      proposalToken: p.shareToken,
      packs,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-bdr pb-4">
        <div>
          <h1 className="text-3xl font-normal tracking-tight text-ink">Proposals</h1>
          <p className="mt-1 text-sm text-ink-2">
            Every proposal sent to a lead. Each pack option carries its own price and
            checkout link.
          </p>
        </div>
        <Link
          href="/admin/proposals/new"
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> New proposal
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <p className="text-sm text-gray-500">No proposals sent yet.</p>
          <Link
            href="/admin/proposals/new"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Create your first proposal
          </Link>
        </div>
      ) : (
        // One row per proposal: who it went to on the left, its options as
        // inline chips on the right — every option's price visible without
        // opening anything.
        <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-gray-50"
            >
              <div className="min-w-[200px] max-w-[280px] flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {row.recipient}
                  <span
                    className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      row.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {row.status}
                  </span>
                </p>
                <p className="truncate text-xs text-gray-500">
                  {row.email}
                  {row.company ? ` · ${row.company}` : ''}
                </p>
              </div>

              <div className="flex flex-1 flex-wrap items-center gap-1.5">
                {row.packs.map((pack, i) => (
                  <a
                    key={pack.id}
                    href={`/quote/${pack.token}`}
                    target="_blank"
                    rel="noreferrer"
                    title={`${pack.label} — ${pack.qty} packs`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white py-1 pl-1.5 pr-2.5 text-xs text-gray-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-600">
                      {i + 1}
                    </span>
                    <span className="max-w-[110px] truncate">{pack.label}</span>
                    <span className="font-medium tabular-nums text-gray-900">
                      {formatRupees(pack.total)}
                    </span>
                  </a>
                ))}
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs tabular-nums text-gray-400">
                  {row.createdAt.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                {row.proposalToken && (
                  <a
                    href={`/proposal/${row.proposalToken}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
