import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ProductForm } from '@/components/admin/products/product-form';

export default async function NewProductPage() {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  return (
    <div className="min-h-screen">
        <ProductForm mode="create" />
    </div>
  );
}
