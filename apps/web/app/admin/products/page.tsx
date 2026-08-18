import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { serializeProduct } from '@/lib/serialize';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ProductDataTable } from '@/components/admin/products/product-data-table';
import { PackDataTable, type PackRow } from '@/components/admin/products/pack-data-table';
import { getBudgetBands } from '@/lib/pack-data';
import { findBandForPrice } from '@/lib/budget-bands';

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
      {tab('Curated Packs', '/admin/products?view=packs', view === 'packs')}
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

  // ── Curated Packs view ────────────────────────────────────────────────────
  // Packs reach customers through two rungs: the occasion they are tagged with
  // and the budget band their price lands in. Both are shown per row, so where
  // a pack surfaces is readable straight off this table.
  if (view === 'packs') {
    const bands = await getBudgetBands();
    const packs = await prisma.product.findMany({
      where: { isPack: true },
      include: {
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        occasions: {
          select: { occasion: { select: { id: true, name: true, isCollection: true } } },
        },
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
  });

    // A pack stores no price or image of its own: the from-price is the sum of
    // its members' tier-1 prices × quantity, and the thumbnail is their collage
    // (unless the pack was given a custom hero image).
    const packsView: PackRow[] = packs.map((p) => {
      const price = p.packItems.reduce(
        (sum, it) => sum + Number(it.product.priceTiers[0]?.sellPrice ?? 0) * it.quantity,
        0
      );
      return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      status: p.status,
      occasions: p.occasions
        .map((po) => po.occasion)
        // `isCollection` entries are the homepage's curated tiles, not occasions.
        .filter((o) => !o.isCollection)
        .map((o) => ({ id: o.id, name: o.name })),
      itemCount: p.packItems.length,
      price,
      // Resolved here, not in the table: the band list lives in the database
      // and the table is a client component.
      budgetBand: findBandForPrice(bands, price)?.name ?? null,
      images: p.images[0]?.url
        ? [p.images[0].url]
        : p.packItems.flatMap((it) => {
            const url = it.product.images[0]?.url;
            return url ? [url] : [];
          }),
      memberNames: p.packItems.map((it) => it.product.name),
      };
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
            <Button
              asChild
              className="rounded-2xl bg-emerald-600 px-8 py-3 font-normal hover:bg-emerald-700 text-white"
            >
              <Link href="/admin/products/new?type=pack">+ New Pack</Link>
            </Button>
          </div>
        </div>

        <ViewTabs view="packs" />

        {packsView.length === 0 ? (
          <div className="text-center py-12 bg-canvas rounded-lg border-2 border-bdr">
            <p className="text-ink-2 mb-4 text-lg">No curated packs yet</p>
            <Button asChild>
              <Link href="/admin/products/new?type=pack">Create your first pack</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Every pack, searchable and selectable. */}
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
