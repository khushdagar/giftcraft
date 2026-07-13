import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { GiftCollectionForm } from '@/components/admin/gift-collections/gift-collection-form';

export const dynamic = 'force-dynamic';

export default async function NewGiftCollectionPage() {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <Link
          href="/admin/products?view=packs"
          className="text-em hover:underline text-sm font-medium"
        >
          ← Back to Curated Collections
        </Link>
        <h1 className="text-3xl font-normal tracking-tight text-ink mt-4">
          New Curated Collection
        </h1>
        <p className="text-sm text-ink-2 mt-2">
          A collection groups several packs under one theme. Create it first, then add packs.
        </p>
      </div>

      <GiftCollectionForm mode="create" />
    </div>
  );
}
