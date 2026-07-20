import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { GocCampaignForm } from '@/components/admin/goc/goc-campaign-form';

export const dynamic = 'force-dynamic';

export default async function EditGocCampaignPage({
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
    include: { options: { orderBy: { sortOrder: 'asc' } } },
  });

  if (!campaign) {
    notFound();
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <Link href={`/admin/goc/${campaign.id}`} className="text-em hover:underline text-sm font-medium">
          ← Back to campaign
        </Link>
        <h1 className="text-3xl font-normal tracking-tight text-ink mt-4">Edit Campaign</h1>
        <p className="text-sm text-ink-2 mt-2">
          Update campaign details, status, and gift options.
        </p>
      </div>

      <GocCampaignForm
        mode="edit"
        campaign={{
          id: campaign.id,
          name: campaign.name,
          slug: campaign.slug,
          description: campaign.description,
          heroImage: campaign.heroImage,
          status: campaign.status,
          claimLimit: campaign.claimLimit,
          expiresAt: campaign.expiresAt ? campaign.expiresAt.toISOString() : null,
          productIds: campaign.options.map((o) => o.productId),
        }}
      />
    </div>
  );
}
