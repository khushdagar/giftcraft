import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { CatalogueBuilder } from '@/components/admin/catalogues/catalogue-builder';

export const dynamic = 'force-dynamic';

export default async function NewCataloguePage() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }
  return <CatalogueBuilder initial={null} />;
}
