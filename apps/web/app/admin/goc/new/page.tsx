import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { GocCampaignForm } from '@/components/admin/goc/goc-campaign-form';

export const dynamic = 'force-dynamic';

export default async function NewGocCampaignPage() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <Link href="/admin/goc" className="text-em hover:underline text-sm font-medium">
          ← Back to GOC Campaigns
        </Link>
        <h1 className="text-3xl font-normal tracking-tight text-ink mt-4">New GOC Campaign</h1>
        <p className="text-sm text-ink-2 mt-2">
          Pick the gift options recipients can choose from, then share one claim link with everyone.
        </p>
      </div>

      <GocCampaignForm mode="create" />
    </div>
  );
}
