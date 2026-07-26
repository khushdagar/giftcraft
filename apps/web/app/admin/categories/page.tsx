import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CategoryList } from '@/components/admin/categories/category-list';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  // Flat list of every category (Shopify collections style). Each row shows a
  // thumbnail, its product count and, since our categories are hierarchical,
  // the parent it belongs under.
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      parentId: true,
      parent: { select: { name: true } },
      _count: { select: { products: true } },
    },
    orderBy: [{ name: 'asc' }],
  });

  return <CategoryList categories={categories} />;
}
