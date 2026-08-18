import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { BudgetBandForm } from '@/components/admin/budget-bands/budget-band-form';

export default async function NewBudgetBandPage() {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  return (
    <div className="mx-auto max-w-5xl">
      <BudgetBandForm mode="create" />
    </div>
  );
}
