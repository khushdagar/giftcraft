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
    <>
      <div className="mb-8 border-b border-bdr pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-ink">Products</h1>
            <p className="mt-1 text-sm text-ink-2">{total} products total</p>
          </div>
          <Button asChild className="rounded-2xl bg-emerald-600 px-6 py-2 font-bold hover:bg-emerald-700">
            <Link href="/admin/products/new">+ New Product</Link>
          </Button>
        </div>
      </div>

      <ProductDataTable
        initialData={serialized}
        total={total}
        page={page}
        limit={limit}
        totalPages={totalPages}
      />
    </>
  );
}
