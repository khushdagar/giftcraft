import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { serializeProduct } from '@/lib/serialize';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ProductDataTable } from '@/components/admin/products/product-data-table';

export const revalidate = 60;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const search = typeof searchParams.search === 'string' ? searchParams.search : '';
  const status = typeof searchParams.status === 'string' ? searchParams.status : '';
  const page = Math.max(1, Number(searchParams.page || '1'));
  const limit = 20;

  const where: any = {};
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }
  if (status) {
    where.status = status;
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        priceTiers: { where: { tier: 1 }, take: 1 },
        images: { where: { isPrimary: true }, take: 1 },
        categories: { include: { category: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  const serialized = products.map(serializeProduct);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Products</h1>
              <p className="text-sm text-gray-500 mt-1">{total} products total</p>
            </div>
            <div className="flex gap-3">
              <Button asChild>
                <Link href="/admin/products/new">+ New Product</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">
        <ProductDataTable
          initialData={serialized}
          total={total}
          page={page}
          limit={limit}
          totalPages={totalPages}
        />
      </div>
    </div>
  );
}
