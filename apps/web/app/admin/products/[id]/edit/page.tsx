import { auth } from '@/auth';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { serializeProduct } from '@/lib/serialize';
import { ProductForm } from '@/components/admin/products/product-form';

export const revalidate = 3600;

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      priceTiers: { orderBy: { tier: 'asc' } },
      images: { orderBy: { sortOrder: 'asc' } },
      hsn: { include: { hsn: true } },
      categories: { include: { category: true } },
      occasions: { include: { occasion: true } },
      variants: { orderBy: { sortOrder: 'asc' } },
      vendors: { include: { vendor: true } },
    },
  });

  if (!product) {
    notFound();
  }

  const serialized = serializeProduct(product);

  return (
    <div className="min-h-screen">
      <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-normal text-gray-900">Edit Product</h1>
          <p className="text-sm text-gray-500 mt-1">{product.name}</p>
      </div>

      <div className="py-12">
        <ProductForm mode="edit" initialData={serialized} />
      </div>
    </div>
  );
}
