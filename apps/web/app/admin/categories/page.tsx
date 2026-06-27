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

  // Select a lightweight product shape + a count at every category level so the
  // tree can show how many products each category holds and list them.
  const productsInclude = {
    include: { product: { select: { id: true, name: true, sku: true, status: true } } },
    orderBy: { product: { name: 'asc' } },
  } as const;

  const [categories, totalProducts] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null },
      include: {
        _count: { select: { products: true } },
        products: productsInclude,
        children: {
          include: {
            _count: { select: { products: true } },
            products: productsInclude,
            children: {
              include: {
                _count: { select: { products: true } },
                products: productsInclude,
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.product.count(),
  ]);

  return (
    <>
      <div className="mb-8 border-b border-bdr pb-8">
        <h1 className="text-3xl font-normal tracking-tight text-ink">Categories</h1>
        <p className="mt-1 text-sm text-ink-2">Manage product categories</p>
      </div>

      <CategoryTree initialCategories={categories} totalProducts={totalProducts} />
    </>
  );
}
