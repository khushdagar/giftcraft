import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { serializeProduct } from '@/lib/serialize';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2 } from 'lucide-react';
import { ProductDataTable } from '@/components/admin/products/product-data-table';
import { ProductsSearch } from './products-search';

export const dynamic = 'force-dynamic';

// The Products admin hosts two entities behind one segmented toggle: regular
// products and Curated Packs (hand-picked assortments). This is the "select for
// product and curated packs" — one place to create/manage both.
function ViewTabs({ view }: { view: 'products' | 'packs' }) {
  const tab = (label: string, href: string, active: boolean) => (
    <Link
      href={href}
      className={`px-5 py-2 rounded-xl text-sm font-medium transition ${
        active ? 'bg-white text-ink shadow-sm' : 'text-ink-2 hover:text-ink'
      }`}
    >
      {label}
    </Link>
  );
  return (
    <div className="inline-flex gap-1 rounded-2xl bg-elevated p-1 border border-bdr">
      {tab('Products', '/admin/products', view === 'products')}
      {tab('Curated Collections', '/admin/products?view=packs', view === 'packs')}
    </div>
  );
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const view = searchParams.view === 'packs' ? 'packs' : 'products';

  // ── Curated Collections view ──────────────────────────────────────────────
  // A collection groups several packs. We list collections (each links to its
  // editor where packs are managed) plus any legacy standalone packs.
  if (view === 'packs') {
    const [collections, ungroupedPacks] = await Promise.all([
      prisma.giftCollection.findMany({
        include: { packProducts: { where: { isPack: true }, select: { id: true, status: true } } },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.product.findMany({
        where: { isPack: true, packCollectionId: null },
        include: {
          packItems: { select: { id: true } },
          images: { where: { isPrimary: true }, take: 1 },
        },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    const collectionsView = collections.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image: c.image,
      gradient: c.gradient,
      isActive: c.isActive,
      isFeatured: c.isFeatured,
      packCount: c.packProducts.length,
      activePackCount: c.packProducts.filter((p) => p.status === 'active').length,
    }));

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-normal tracking-tight text-ink">Products</h1>
            <p className="mt-2 text-sm text-ink-2">Manage your product catalog</p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" className="rounded-2xl px-6 py-3 font-normal">
              <Link href="/admin/gift-collections/new">+ New Collection</Link>
            </Button>
            <Button
              asChild
              className="rounded-2xl bg-emerald-600 px-8 py-3 font-normal hover:bg-emerald-700 text-white"
            >
              <Link href="/admin/products/new?type=pack">+ New Pack</Link>
            </Button>
          </div>
        </div>

        <ViewTabs view="packs" />

        {collectionsView.length === 0 && ungroupedPacks.length === 0 ? (
          <div className="text-center py-12 bg-canvas rounded-lg border-2 border-bdr">
            <p className="text-ink-2 mb-4 text-lg">No curated collections yet</p>
            <Button asChild>
              <Link href="/admin/gift-collections/new">Create your first collection</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {collectionsView.length > 0 && (
              <div className="border border-bdr rounded-lg overflow-x-auto bg-white">
                <table className="w-full min-w-[720px]">
                  <thead className="bg-elevated border-b border-bdr">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Collection</th>
                      <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Packs</th>
                      <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-normal text-ink-2 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bdr">
                    {collectionsView.map((c) => (
                      <tr key={c.id} className="hover:bg-canvas transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-12 h-9 rounded-md flex-shrink-0 overflow-hidden bg-gray-100"
                              style={{ background: c.image ? undefined : c.gradient || '#E5DFD4' }}
                            >
                              {c.image && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-ink">{c.name}</p>
                              <p className="text-xs text-ink-2 mt-1">/{c.slug}</p>
                            </div>
                            {c.isFeatured && (
                              <Badge variant="gold" className="ml-1">Featured</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-ink-2">
                            {c.packCount} pack{c.packCount === 1 ? '' : 's'}
                            {c.packCount > 0 && (
                              <span className="text-ink-3"> · {c.activePackCount} active</span>
                            )}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={c.isActive ? 'em' : 'grey'}>
                            {c.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/admin/gift-collections/${c.id}/edit`} className="inline-block">
                            <Button variant="outline" size="sm" className="rounded-lg">
                              <Edit2 className="w-4 h-4 mr-1" />
                              Manage
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Legacy standalone packs (not yet in a collection). */}
            {ungroupedPacks.length > 0 && (
              <div>
                <div className="mb-3">
                  <h2 className="text-lg font-normal text-ink">Ungrouped packs</h2>
                  <p className="text-sm text-ink-2">
                    These packs aren’t in a collection yet. Open one and assign it to a collection.
                  </p>
                </div>
                <div className="border border-bdr rounded-lg overflow-x-auto bg-white">
                  <table className="w-full min-w-[560px]">
                    <thead className="bg-elevated border-b border-bdr">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Pack</th>
                        <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Products</th>
                        <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Status</th>
                        <th className="px-6 py-4 text-right text-xs font-normal text-ink-2 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bdr">
                      {ungroupedPacks.map((pack) => (
                        <tr key={pack.id} className="hover:bg-canvas transition">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-9 rounded-md flex-shrink-0 overflow-hidden bg-gray-100">
                                {pack.images[0]?.url && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={pack.images[0].url} alt={pack.name} className="w-full h-full object-cover" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-ink">{pack.name}</p>
                                <p className="text-xs text-ink-2 mt-1">/{pack.slug}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-ink-2">{pack.packItems.length} products</p>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={pack.status === 'active' ? 'em' : 'grey'}>
                              {pack.status === 'active' ? 'Active' : 'Draft'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link href={`/admin/products/${pack.id}/edit`} className="inline-block">
                              <Button variant="outline" size="sm" className="rounded-lg">
                                <Edit2 className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Products view ─────────────────────────────────────────────────────────
  const search = typeof searchParams.search === 'string' ? searchParams.search : '';
  const status = typeof searchParams.status === 'string' ? searchParams.status : '';
  const page = Math.max(1, Number(searchParams.page || '1'));
  const limit = 20;

  const where: any = { isPack: false };
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
        vendors: { include: { vendor: { select: { name: true } } } },
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-normal tracking-tight text-ink">Products</h1>
          <p className="mt-2 text-sm text-ink-2">Manage your product catalog</p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" className="rounded-2xl px-6 py-3 font-normal">
            <Link href="/admin/products/bulk-upload">Bulk Upload</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-2xl px-6 py-3 font-normal">
            <Link href="/admin/products/bulk-images">Bulk Images</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-2xl px-6 py-3 font-normal">
            <Link href="/admin/products/new?type=pack">+ New Pack</Link>
          </Button>
          <Button asChild className="rounded-2xl bg-emerald-600 px-8 py-3 font-normal hover:bg-emerald-700 text-white">
            <Link href="/admin/products/new">+ New Product</Link>
          </Button>
        </div>
      </div>

      <ProductsSearch />

      <ViewTabs view="products" />

      {/* Product Grid */}
      <ProductDataTable
        initialData={serialized}
        total={total}
        page={page}
        limit={limit}
        totalPages={totalPages}
      />
    </div>
  );
}
