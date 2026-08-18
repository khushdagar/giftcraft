import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { serializeProduct } from '@/lib/serialize';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2 } from 'lucide-react';
import { ProductDataTable } from '@/components/admin/products/product-data-table';
import { PackDataTable, type PackRow } from '@/components/admin/products/pack-data-table';

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
  // A collection groups several packs. We list the collections (each links to
  // its editor) above a searchable table of every pack, where packs are edited
  // and deleted directly.
  if (view === 'packs') {
    const [collections, packs] = await Promise.all([
      prisma.giftCollection.findMany({
        include: { packProducts: { where: { isPack: true }, select: { id: true, status: true } } },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      prisma.product.findMany({
        where: { isPack: true },
        include: {
          images: { where: { isPrimary: true }, take: 1, select: { url: true } },
          packCollection: { select: { id: true, name: true } },
          packItems: {
            orderBy: { sortOrder: 'asc' },
            select: {
              quantity: true,
              product: {
                select: {
                  name: true,
                  images: { where: { isPrimary: true }, take: 1, select: { url: true } },
                  priceTiers: { where: { tier: 1 }, take: 1, select: { sellPrice: true } },
                },
              },
            },
          },
        },
        // Active first, then draft/archived/seasonal (enum declaration order),
        // newest first within each band — same ordering as the products list.
        orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
    ]);

    // A pack stores no price or image of its own: the from-price is the sum of
    // its members' tier-1 prices × quantity, and the thumbnail is their collage
    // (unless the pack was given a custom hero image).
    const packsView: PackRow[] = packs.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      status: p.status,
      collectionId: p.packCollection?.id ?? null,
      collectionName: p.packCollection?.name ?? null,
      itemCount: p.packItems.length,
      price: p.packItems.reduce(
        (sum, it) => sum + Number(it.product.priceTiers[0]?.sellPrice ?? 0) * it.quantity,
        0
      ),
      images: p.images[0]?.url
        ? [p.images[0].url]
        : p.packItems.flatMap((it) => {
            const url = it.product.images[0]?.url;
            return url ? [url] : [];
          }),
      memberNames: p.packItems.map((it) => it.product.name),
    }));

    const toRow = (c: (typeof collections)[number], depth: number, childCount: number) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image: c.image,
      gradient: c.gradient,
      isActive: c.isActive,
      isFeatured: c.isFeatured,
      depth,
      childCount,
      packCount: c.packProducts.length,
      activePackCount: c.packProducts.filter((p) => p.status === 'active').length,
    });

    // Flatten the two-level tree into display order: each top-level collection
    // followed by its own sub-collections, indented one step.
    const collectionsView = collections
      .filter((c) => c.parentId === null)
      .flatMap((parent) => {
        const children = collections.filter((c) => c.parentId === parent.id);
        return [
          toRow(parent, 0, children.length),
          ...children.map((child) => toRow(child, 1, 0)),
        ];
      });

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-normal tracking-tight text-ink">Products</h1>
            <p className="mt-2 text-sm text-ink-2">Manage your product catalog</p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" className="rounded-2xl px-6 py-3 font-normal">
              <Link href="/admin/products/packs-bulk-upload">Bulk Upload Packs</Link>
            </Button>
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

        {collectionsView.length === 0 && packsView.length === 0 ? (
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
                      <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Contains</th>
                      <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-normal text-ink-2 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bdr">
                    {collectionsView.map((c) => (
                      <tr key={c.id} className="hover:bg-canvas transition">
                        <td className="px-6 py-4">
                          <div
                            className="flex items-center gap-3"
                            style={{ paddingLeft: c.depth * 28 }}
                          >
                            {c.depth > 0 && (
                              <span className="text-ink-3 select-none" aria-hidden="true">
                                └
                              </span>
                            )}
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
                          <Badge variant={c.depth > 0 ? 'grey' : 'em'}>
                            {c.depth > 0 ? 'Sub-collection' : 'Main collection'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {/* A collection shows EITHER its sub-collections or
                              its packs to customers — say which, so it's clear
                              where new packs should go. */}
                          {c.childCount > 0 ? (
                            <p className="text-sm text-ink-2">
                              {c.childCount} sub-collection{c.childCount === 1 ? '' : 's'}
                              {c.packCount > 0 && (
                                <span className="text-amber-700">
                                  {' '}
                                  · {c.packCount} pack{c.packCount === 1 ? '' : 's'} hidden here
                                </span>
                              )}
                            </p>
                          ) : (
                            <p className="text-sm text-ink-2">
                              {c.packCount} pack{c.packCount === 1 ? '' : 's'}
                              {c.packCount > 0 && (
                                <span className="text-ink-3"> · {c.activePackCount} active</span>
                              )}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={c.isActive ? 'em' : 'grey'}>
                            {c.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            {c.depth === 0 && (
                              <Link
                                href={`/admin/gift-collections/new?parent=${c.id}`}
                                className="inline-block"
                              >
                                <Button variant="ghost" size="sm" className="rounded-lg text-ink-2">
                                  + Sub-collection
                                </Button>
                              </Link>
                            )}
                            <Link href={`/admin/gift-collections/${c.id}/edit`} className="inline-block">
                              <Button variant="outline" size="sm" className="rounded-lg">
                                <Edit2 className="w-4 h-4 mr-1" />
                                Manage
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Every pack, searchable and selectable — the collections table
                above manages the groups, this manages the packs themselves. */}
            <div>
              <div className="mb-3">
                <h2 className="text-lg font-normal text-ink">All curated packs</h2>
                <p className="text-sm text-ink-2">
                  Select packs to delete them, or click a row to edit. Deleting a pack never
                  touches the products inside it.
                </p>
              </div>
              <PackDataTable packs={packsView} />
            </div>
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
    // Match the placeholder's promise: name OR SKU.
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
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
      // Active products first, then draft, archived, seasonal. Postgres sorts an
      // enum by its DECLARATION order, and ProductStatus is declared in exactly
      // that sequence — so a plain ascending sort gives the intended grouping.
      // Newest first within each status band.
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
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
