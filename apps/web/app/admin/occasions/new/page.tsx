import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { OccasionForm } from '@/components/admin/occasions/occasion-form';
import Link from 'next/link';

export default async function NewOccasionPage() {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <Link href="/admin/occasions" className="text-em hover:underline text-sm font-medium">
          ← Back to Occasions
        </Link>
        <h1 className="text-3xl font-normal tracking-tight text-ink mt-4">Create New Occasion</h1>
        <p className="text-sm text-ink-2 mt-2">Add a new gifting occasion to the platform</p>
      </div>

      <OccasionForm mode="create" />
    </div>
  );
}
