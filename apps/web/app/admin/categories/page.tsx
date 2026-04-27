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
    <>
      <div className="mb-8 border-b border-bdr pb-8">
        <h1 className="text-3xl font-black tracking-tight text-ink">Categories</h1>
        <p className="mt-1 text-sm text-ink-2">Manage product categories</p>
      </div>

      <CategoryTree initialCategories={categories} />
    </>
  );
}
