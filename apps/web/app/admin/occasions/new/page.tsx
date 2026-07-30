import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { OccasionForm } from '@/components/admin/occasions/occasion-form';

export default async function NewOccasionPage() {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  return (
    <div className="mx-auto max-w-5xl">
      <OccasionForm mode="create" />
    </div>
  );
}
