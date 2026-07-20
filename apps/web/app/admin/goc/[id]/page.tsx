import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Edit2, Package, Gift, Users, Clock } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/badge';
import { CopyClaimLink } from '@/components/admin/goc/copy-claim-link';

export const dynamic = 'force-dynamic';

const STATUS_VARIANT = {
  active: 'em',
  draft: 'grey',
  paused: 'orange',
  expired: 'red',
} as const;

const CLAIM_STATUS_STYLE: Record<string, string> = {
  submitted: 'bg-em-50 text-em-700',
  fulfilled: 'bg-[#E8E0F5] text-[#5B3D8F]',
  pending: 'bg-elevated text-ink-3',
};

export default async function GocCampaignDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const campaign = await prisma.gocCampaign.findUnique({
    where: { id: params.id },
    include: {
      options: {
        orderBy: { sortOrder: 'asc' },
        include: {
          product: {
            select: { id: true, name: true, slug: true, images: { where: { isPrimary: true }, take: 1 } },
          },
        },
      },
      claims: {
        orderBy: { createdAt: 'desc' },
        include: { option: { include: { product: { select: { name: true } } } } },
      },
    },
  });

  if (!campaign) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const claimUrl = `${baseUrl}/claim/${campaign.slug}`;

  const stats = [
    { icon: Gift, label: 'Gift options', value: String(campaign.options.length) },
    {
      icon: Users,
      label: 'Claims',
      value: campaign.claimLimit != null
        ? `${campaign.claims.length} / ${campaign.claimLimit}`
        : String(campaign.claims.length),
    },
    {
      icon: Clock,
      label: 'Expires',
      value: campaign.expiresAt ? new Date(campaign.expiresAt).toLocaleDateString() : 'Never',
    },
  ];

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin/goc" className="text-em hover:underline text-sm font-medium">
          ← Back to GOC Campaigns
        </Link>
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-normal tracking-tight text-ink">{campaign.name}</h1>
              <Badge variant={STATUS_VARIANT[campaign.status] ?? 'grey'}>{campaign.status}</Badge>
            </div>
            {campaign.description && (
              <p className="text-sm text-ink-2 mt-2 max-w-2xl">{campaign.description}</p>
            )}
          </div>
          <Link
            href={`/admin/goc/${campaign.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-bdr px-4 py-2.5 text-sm font-medium text-ink hover:border-em transition"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </Link>
        </div>
      </div>

      {/* Claim link */}
      <div className="bg-white rounded-lg border-2 border-bdr p-6 space-y-3">
        <h2 className="text-lg font-normal text-ink">Claim link</h2>
        <p className="text-sm text-ink-2">
          Share this single link with all your recipients. Each person picks a gift and enters their
          own delivery address.
          {campaign.status !== 'active' && (
            <span className="text-orange-600">
              {' '}
              The campaign is <strong>{campaign.status}</strong> — recipients can only claim while it
              is <strong>active</strong>.
            </span>
          )}
        </p>
        <CopyClaimLink url={claimUrl} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-lg border-2 border-bdr p-5">
            <div className="flex items-center gap-2 text-ink-2">
              <s.icon className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wide">{s.label}</span>
            </div>
            <p className="mt-2 text-2xl font-normal text-ink">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Gift options */}
      <div className="bg-white rounded-lg border-2 border-bdr p-6">
        <h2 className="text-lg font-normal text-ink mb-4">Gift options</h2>
        {campaign.options.length === 0 ? (
          <p className="text-sm text-ink-2">No options configured.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {campaign.options.map((o) => (
              <div key={o.id} className="rounded-lg border border-bdr overflow-hidden">
                <div className="aspect-square bg-canvas flex items-center justify-center">
                  {o.product.images[0]?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={o.product.images[0].url}
                      alt={o.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="h-6 w-6 text-ink-3" />
                  )}
                </div>
                <p className="px-3 py-2 text-xs text-ink truncate">{o.product.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Claims */}
      <div className="bg-white rounded-lg border-2 border-bdr overflow-hidden">
        <div className="px-6 py-4 border-b border-bdr">
          <h2 className="text-lg font-normal text-ink">
            Claims <span className="text-ink-3 text-sm">({campaign.claims.length})</span>
          </h2>
        </div>
        {campaign.claims.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto mb-2 h-6 w-6 text-ink-3" />
            <p className="text-sm text-ink-2">No claims yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-elevated border-b border-bdr">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-normal text-ink-2 uppercase">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-ink-2 uppercase">
                    Chosen gift
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-ink-2 uppercase">
                    Delivery
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-ink-2 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-ink-2 uppercase">
                    Claimed
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bdr">
                {campaign.claims.map((claim) => {
                  const addr = (claim.addressJson as any) || {};
                  return (
                    <tr key={claim.id} className="hover:bg-canvas transition">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-ink">{claim.claimerName || '—'}</p>
                        <p className="text-xs text-ink-3">{claim.claimerEmail || ''}</p>
                        {claim.claimerPhone && (
                          <p className="text-xs text-ink-3">{claim.claimerPhone}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-ink-2">
                        {claim.option?.product?.name || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-ink-2">
                        {addr.city || addr.state ? (
                          <>
                            {[addr.city, addr.state].filter(Boolean).join(', ')}
                            {addr.pincode && <span className="text-ink-3"> — {addr.pincode}</span>}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            CLAIM_STATUS_STYLE[claim.status] || 'bg-elevated text-ink-3'
                          }`}
                        >
                          {claim.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-ink-2">
                        {claim.claimedAt ? new Date(claim.claimedAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
