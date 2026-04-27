import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CategoryForm } from '@/components/admin/categories/category-form';

export default async function NewCategoryPage() {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const categories = await prisma.category.findMany({
    where: { parentId: null },
    select: { id: true, name: true },
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <>
      <div className="mb-8 border-b border-bdr pb-8">
        <h1 className="text-3xl font-black tracking-tight text-ink">Create Category</h1>
        <p className="mt-1 text-sm text-ink-2">Add a new product category</p>
      </div>

      <div className="max-w-2xl">
        <CategoryForm parentCategories={categories} />
      </div>
    </>
  );
}
