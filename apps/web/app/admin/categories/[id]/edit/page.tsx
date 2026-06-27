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

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-4xl mx-auto px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-normal text-ink">Edit Category</h1>
          <p className="text-sm text-gray-500 mt-2">Update category details and image</p>
        </div>
        <CategoryForm mode="edit" parentCategories={parentCategories} category={category} />
      </div>
    </div>
  );
}
