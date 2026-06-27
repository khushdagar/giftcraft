import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CategoryForm } from '@/components/admin/categories/category-form';

export default async function NewCategoryPage() {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const parentCategories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-4xl mx-auto px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-normal text-ink">Create New Category</h1>
          <p className="text-sm text-gray-500 mt-2">Add a new category with optional image</p>
        </div>
        <CategoryForm mode="create" parentCategories={parentCategories} />
      </div>
    </div>
  );
}
