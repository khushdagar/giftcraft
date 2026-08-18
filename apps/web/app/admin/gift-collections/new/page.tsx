import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { GiftCollectionForm } from '@/components/admin/gift-collections/gift-collection-form';

export const dynamic = 'force-dynamic';

export default async function NewGiftCollectionPage() {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  return (
    <div className="min-h-screen">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-normal text-gray-900">New Curated Collection</h1>
        <p className="text-sm text-gray-500 mt-1">
          A collection groups several packs under one theme. Create it first, then add packs.
        </p>
      </div>

      <div className="py-6">
        <GiftCollectionForm mode="create" />
      </div>
    </div>
  );
}
