import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ProductForm } from '@/components/admin/products/product-form';

export default async function NewProductPage() {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-900">Create Product</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8">
        <ProductForm mode="create" />
      </div>
    </div>
  );
}
