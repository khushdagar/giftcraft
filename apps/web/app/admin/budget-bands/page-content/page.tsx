import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getCuratedHubContent, HUB_PATH, HUB_LABEL } from '@/lib/curated-hub-content';
import { CuratedHubContentForm } from '@/components/admin/curated-hub-content-form';

export const dynamic = 'force-dynamic';

export default async function BudgetHubContentPage() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const initial = await getCuratedHubContent('budget');

  return (
    <CuratedHubContentForm
      hub="budget"
      backHref="/admin/budget-bands"
      backLabel="Budget bands"
      pagePath={HUB_PATH.budget}
      pageLabel={HUB_LABEL.budget}
      initial={initial}
    />
  );
}
