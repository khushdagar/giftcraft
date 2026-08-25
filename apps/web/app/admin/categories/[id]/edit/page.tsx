import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CategoryForm } from '@/components/admin/categories/category-form';

export default async function EditCategoryPage({ params }: { params: { id: string } }) {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const category = await prisma.category.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      contentBelow: true,
      faqs: true,
      metaTitle: true,
      metaDescription: true,
      parentId: true,
      sortOrder: true,
      imageUrl: true,
      products: {
        select: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              status: true,
              images: {
                take: 1,
                orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                select: { url: true },
              },
            },
          },
        },
        orderBy: { product: { name: 'asc' } },
      },
    },
  });

  if (!category) {
    redirect('/admin/categories');
  }

  const parentCategories = await prisma.category.findMany({
    where: {
      parentId: null,
      id: { not: category.id }, // Exclude current category
    },
    orderBy: { sortOrder: 'asc' },
  });

  const { products, ...categoryData } = category;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-6">
        <CategoryForm mode="edit" parentCategories={parentCategories} category={categoryData} products={products} />
      </div>
    </div>
  );
}
