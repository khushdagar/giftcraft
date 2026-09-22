import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getCuratedHubContent, HUB_PATH, HUB_LABEL } from '@/lib/curated-hub-content';
import { CuratedHubContentForm } from '@/components/admin/curated-hub-content-form';

export const dynamic = 'force-dynamic';

export default async function OccasionsHubContentPage() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const initial = await getCuratedHubContent('occasions');

  return (
    <CuratedHubContentForm
      hub="occasions"
      backHref="/admin/occasions"
      backLabel="Occasions"
      pagePath={HUB_PATH.occasions}
      pageLabel={HUB_LABEL.occasions}
      initial={initial}
    />
  );
}
