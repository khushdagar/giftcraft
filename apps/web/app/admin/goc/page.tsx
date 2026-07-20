import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Plus, Edit2 } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

const STATUS_VARIANT = {
  active: 'em',
  draft: 'grey',
  paused: 'orange',
  expired: 'red',
} as const;

export default async function AdminGocPage() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const campaigns = await prisma.gocCampaign.findMany({
    include: { _count: { select: { options: true, claims: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-normal tracking-tight text-ink">GOC Campaigns</h1>
          <p className="mt-2 text-sm text-ink-2">
            Gift-of-Choice campaigns — let recipients pick and address their own gift from a curated
            shortlist.
          </p>
        </div>
        <Link
          href="/admin/goc/new"
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 font-normal text-white transition hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-16 bg-canvas rounded-lg border-2 border-dashed border-bdr">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-ink-3" />
          <p className="text-ink font-medium">No campaigns yet</p>
          <p className="mt-1 text-sm text-ink-2">
            Create a Gift-of-Choice campaign and share one link with all your recipients.
          </p>
          <Link
            href="/admin/goc/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-em px-5 py-2.5 text-sm font-medium text-white hover:bg-em-600"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </Link>
        </div>
      ) : (
        <div className="border border-bdr rounded-lg overflow-x-auto bg-white">
          <table className="w-full min-w-[760px]">
            <thead className="bg-elevated border-b border-bdr">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">
                  Campaign
                </th>
                <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">
                  Options
                </th>
                <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">
                  Claims
                </th>
                <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">
                  Expires
                </th>
                <th className="px-6 py-4 text-right text-xs font-normal text-ink-2 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bdr">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-canvas transition">
                  <td className="px-6 py-4">
                    <Link href={`/admin/goc/${c.id}`} className="block">
                      <p className="text-sm font-medium text-ink hover:text-em">{c.name}</p>
                      <p className="text-xs text-ink-3">/claim/{c.slug}</p>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={STATUS_VARIANT[c.status] ?? 'grey'}>{c.status}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-2">{c._count.options}</td>
                  <td className="px-6 py-4 text-sm text-ink-2">
                    {c._count.claims}
                    {c.claimLimit != null && (
                      <span className="text-ink-3"> / {c.claimLimit}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-2">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/goc/${c.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-bdr px-3 py-1.5 text-sm text-ink hover:border-em transition"
                    >
                      <Edit2 className="h-4 w-4" />
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
