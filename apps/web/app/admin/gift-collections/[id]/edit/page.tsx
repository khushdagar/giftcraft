import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { formatRupees } from '@/lib/utils';
import { GiftCollectionForm } from '@/components/admin/gift-collections/gift-collection-form';

export const dynamic = 'force-dynamic';

export default async function EditGiftCollectionPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const collection = await prisma.giftCollection.findUnique({
    where: { id: params.id },
    include: {
      children: {
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          image: true,
          gradient: true,
          isActive: true,
          _count: { select: { packProducts: true } },
        },
      },
      packProducts: {
        where: { isPack: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          packItems: {
            include: {
              product: {
                select: {
                  images: { where: { isPrimary: true }, take: 1, select: { url: true } },
                  priceTiers: { where: { tier: 1 }, select: { sellPrice: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!collection) {
    notFound();
  }

  // Only top-level collections can be parents, and never this one itself.
  const parentOptions = await prisma.giftCollection.findMany({
    where: { parentId: null, id: { not: collection.id } },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  });

  // "From" price per pack = one of each product at tier-1 pricing × item quantity.
  // A pack rarely has an image of its own, so fall back to its members' images —
  // the same collage the storefront renders.
  const packs = collection.packProducts.map((pack) => {
    const fromPrice = pack.packItems.reduce((sum, it) => {
      const tier1 = it.product.priceTiers[0];
      return sum + (tier1 ? Number(tier1.sellPrice) : 0) * it.quantity;
    }, 0);
    const memberImages = pack.packItems.flatMap((it) => {
      const url = it.product.images[0]?.url;
      return url ? [url] : [];
    });
    return {
      id: pack.id,
      name: pack.name,
      images: pack.images[0]?.url ? [pack.images[0].url] : memberImages.slice(0, 4),
      isActive: pack.status === 'active',
      productCount: pack.packItems.length,
      fromPrice,
    };
  });

  const stats = {
    packCount: packs.length,
    activePackCount: packs.filter((p) => p.isActive).length,
    productCount: packs.reduce((sum, p) => sum + p.productCount, 0),
  };

  // A collection holds EITHER sub-collections or packs. Both panels render, so
  // the admin can see exactly which of the two this collection is acting as.
  const childrenPanel = (
    <div className="bg-white rounded-lg border-2 border-bdr p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-normal text-ink">Sub-collections</h2>
          <p className="text-sm text-ink-2 mt-0.5">
            {collection.children.length === 0
              ? 'None — customers see this collection’s packs directly.'
              : `${collection.children.length} sub-collection${
                  collection.children.length === 1 ? '' : 's'
                } — customers see these first, then the packs inside one.`}
          </p>
        </div>
        {collection.parentId === null && (
          <Link
            href={`/admin/gift-collections/new?parent=${collection.id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-em hover:bg-em-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Sub-collection
          </Link>
        )}
      </div>

      {collection.children.length === 0 ? (
        <div className="text-center py-8 bg-canvas rounded-lg border-2 border-dashed border-bdr">
          <p className="text-ink-2">No sub-collections</p>
          <p className="text-xs text-ink-3 mt-1">
            {collection.parentId === null
              ? 'Add one to group this collection’s packs into themes. Until then, the packs below show directly.'
              : 'This is itself a sub-collection, so it cannot hold more.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {collection.children.map((child) => (
            <Link
              key={child.id}
              href={`/admin/gift-collections/${child.id}/edit`}
              className="flex items-center gap-3 p-3 rounded-lg border border-bdr hover:border-em transition-colors"
            >
              <div
                className="w-12 h-10 rounded-md flex-shrink-0 overflow-hidden bg-gray-100"
                style={{ background: child.image ? undefined : child.gradient || '#E5DFD4' }}
              >
                {child.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={child.image} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink truncate">{child.name}</p>
                <p className="text-xs text-ink-2">
                  {child._count.packProducts} pack
                  {child._count.packProducts === 1 ? '' : 's'} · /{child.slug}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  child.isActive ? 'bg-em-50 text-em-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {child.isActive ? 'Active' : 'Draft'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  // Rendered into the form's main column via the packsSlot prop, so the packs
  // list and the collection fields share one two-column layout.
  const packsPanel = (
    <div className="bg-white rounded-lg border-2 border-bdr p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-normal text-ink">Packs in this collection</h2>
          <p className="text-sm text-ink-2 mt-0.5">
            {packs.length === 0
              ? 'No packs yet.'
              : `${packs.length} pack${packs.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <Link
          href="/admin/products/new?type=pack"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-em hover:bg-em-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Pack
        </Link>
      </div>

      {/* A collection shows its sub-collections OR its packs, never both — so
          packs left here while sub-collections exist are invisible to
          customers. Say so loudly rather than letting them sit unnoticed. */}
      {collection.children.length > 0 && packs.length > 0 && (
        <div className="mb-4 rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            These packs are hidden from customers
          </p>
          <p className="mt-1 text-xs text-amber-800">
            This collection has sub-collections, so its page shows those instead of packs. Open each
            pack and move it into one of the sub-collections above.
          </p>
        </div>
      )}

      {packs.length === 0 ? (
        <div className="text-center py-8 bg-canvas rounded-lg border-2 border-dashed border-bdr">
          <p className="text-ink-2">This collection has no packs</p>
          <p className="text-xs text-ink-3 mt-1">
            Create a pack from Products → New → Curated Pack and assign it to this collection.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {packs.map((pack) => (
            <Link
              key={pack.id}
              href={`/admin/products/${pack.id}/edit`}
              className="flex items-center gap-3 p-3 rounded-lg border border-bdr hover:border-em transition-colors"
            >
              <div
                className="grid w-12 h-10 gap-px rounded-md flex-shrink-0 overflow-hidden bg-gray-100"
                style={{
                  gridTemplateColumns: `repeat(${pack.images.length > 1 ? 2 : 1}, 1fr)`,
                  gridAutoRows: '1fr',
                }}
              >
                {pack.images.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt="" className="w-full h-full object-cover" />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink truncate">{pack.name}</p>
                <p className="text-xs text-ink-2">
                  {pack.productCount} products
                  {pack.fromPrice > 0 && <> · From {formatRupees(pack.fromPrice)}/pack</>}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  pack.isActive ? 'bg-em-50 text-em-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {pack.isActive ? 'Active' : 'Draft'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-normal text-gray-900">Edit Collection</h1>
        <p className="text-sm text-gray-500 mt-1">{collection.name}</p>
      </div>

      <div className="py-6">
        <GiftCollectionForm
          mode="edit"
          collection={{
            id: collection.id,
            name: collection.name,
            slug: collection.slug,
            description: collection.description,
            image: collection.image,
            gradient: collection.gradient,
            isActive: collection.isActive,
            isFeatured: collection.isFeatured,
            sortOrder: collection.sortOrder,
            parentId: collection.parentId,
          }}
          parentOptions={parentOptions}
          hasChildren={collection.children.length > 0}
          packsSlot={
            <>
              {childrenPanel}
              {packsPanel}
            </>
          }
          stats={stats}
        />
      </div>
    </div>
  );
}
