import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CategoryTree } from '@/components/admin/categories/category-tree';

export const revalidate = 3600;

export default async function AdminCategoriesPage() {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const categories = await prisma.category.findMany({
    where: { parentId: null },
    include: {
      children: {
        include: {
          children: {
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <div className="min-h-screen bg-canvas">
      <div className="border-b border-bdr">
        <div className="max-w-4xl mx-auto px-8 py-8">
          <h1 className="text-2xl font-bold text-ink">Categories</h1>
          <p className="text-sm text-ink-2 mt-1">Manage product categories</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8">
        <CategoryTree initialCategories={categories} />
      </div>
    </div>
  );
}
