import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { NewItemSwitcher } from '@/components/admin/products/new-item-switcher';

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const initialType = searchParams.type === 'pack' ? 'pack' : 'product';

  return (
    <div className="min-h-screen">
      <NewItemSwitcher initialType={initialType} />
    </div>
  );
}
