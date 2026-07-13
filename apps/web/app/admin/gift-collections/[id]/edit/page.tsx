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
      packProducts: {
        where: { isPack: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          packItems: {
            include: {
              product: {
                select: {
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

  // "From" price per pack = one of each product at tier-1 pricing × item quantity.
  const packs = collection.packProducts.map((pack) => {
    const fromPrice = pack.packItems.reduce((sum, it) => {
      const tier1 = it.product.priceTiers[0];
      return sum + (tier1 ? Number(tier1.sellPrice) : 0) * it.quantity;
    }, 0);
    return {
      id: pack.id,
      name: pack.name,
      image: pack.images[0]?.url ?? null,
      isActive: pack.status === 'active',
      productCount: pack.packItems.length,
      fromPrice,
    };
  });

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <Link
          href="/admin/products?view=packs"
          className="text-em hover:underline text-sm font-medium"
        >
          ← Back to Curated Collections
        </Link>
        <h1 className="text-3xl font-normal tracking-tight text-ink mt-4">Edit Collection</h1>
        <p className="text-sm text-ink-2 mt-2">Update the collection details and manage its packs</p>
      </div>

      {/* Packs in this collection */}
      <div className="bg-white rounded-lg border-2 border-bdr p-6 mb-6">
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
                <div className="w-12 h-10 rounded-md flex-shrink-0 overflow-hidden bg-gray-100">
                  {pack.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pack.image} alt={pack.name} className="w-full h-full object-cover" />
                  )}
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
                    pack.isActive
                      ? 'bg-em-50 text-em-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {pack.isActive ? 'Active' : 'Draft'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

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
        }}
      />
    </div>
  );
}
