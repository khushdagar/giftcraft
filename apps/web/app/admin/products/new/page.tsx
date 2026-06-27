import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ProductForm } from '@/components/admin/products/product-form';

export default async function NewProductPage() {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-7xl mx-auto px-6">
        <ProductForm mode="create" />
      </div>
    </div>
  );
}
