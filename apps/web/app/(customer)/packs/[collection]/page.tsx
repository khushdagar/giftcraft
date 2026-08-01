import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { formatRupees } from '@/lib/utils';
import { JsonLd } from '@/components/seo/json-ld';
import { itemListSchema, breadcrumbSchema } from '@/lib/schema';

// ISR: cacheable HTML for crawlers + users, refreshed hourly.
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { collection: string } }) {
  const collection = await prisma.giftCollection.findUnique({
    where: { slug: params.collection },
    select: { name: true, description: true, isActive: true, image: true },
  });
  if (!collection || !collection.isActive)
    return { title: 'Collection not found', robots: { index: false, follow: false } };
  const description =
    collection.description || `Curated corporate gift packs in the ${collection.name} collection.`;
  const ogImage = collection.image || '/opengraph-image';
  return {
    // Root template appends "· GIVOO"
    title: `${collection.name} Gift Packs`,
    description,
    alternates: { canonical: `/packs/${params.collection}` },
    openGraph: {
      type: 'website',
      url: `/packs/${params.collection}`,
      title: `${collection.name} Gift Packs`,
      description,
      siteName: 'GIVOO',
      locale: 'en_IN',
      images: [{ url: ogImage, alt: `${collection.name} gift packs` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${collection.name} Gift Packs`,
      description,
      images: [ogImage],
    },
  };
}

export default async function CollectionDetailPage({
  params,
}: {
  params: { collection: string };
}) {
  const collection = await prisma.giftCollection.findUnique({
    where: { slug: params.collection },
    include: {
      packProducts: {
        where: { isPack: true, status: 'active' },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          packItems: {
            include: {
              product: {
                select: {
                  images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                  priceTiers: { where: { tier: 1 }, select: { sellPrice: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!collection || !collection.isActive) {
    notFound();
  }

  const packs = collection.packProducts.map((pack) => ({
    id: pack.id,
    name: pack.name,
    slug: pack.slug,
    description: pack.descriptionShort,
    image: pack.images[0]?.url ?? null,
    productImages: pack.packItems.map((it) => it.product.images[0]?.url ?? null),
    productCount: pack.packItems.length,
    fromPrice: pack.packItems.reduce((sum, it) => {
      const tier1 = it.product.priceTiers[0];
      return sum + (tier1 ? Number(tier1.sellPrice) : 0) * it.quantity;
    }, 0),
  }));

  return (
    <div className="min-h-screen" style={{ background: '#F5F1EB' }}>
      <JsonLd
        data={itemListSchema(packs.map((p) => ({ name: p.name, path: `/products/${p.slug}` })))}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Curated Packs', path: '/packs' },
          { name: collection.name, path: `/packs/${params.collection}` },
        ])}
      />
      <div className="py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-10">
          <p className="text-xs" style={{ color: '#8F8A82' }}>
            <Link href="/" style={{ color: '#800020' }}>
              Home
            </Link>{' '}
            /{' '}
            <Link href="/packs" style={{ color: '#800020' }}>
              Curated Packs
            </Link>{' '}
            / <span>{collection.name}</span>
          </p>
          <h1 className="text-4xl md:text-5xl font-serif font-light mt-2">{collection.name}</h1>
          {collection.description && (
            <p className="mt-2 text-base max-w-2xl" style={{ color: '#5C5852' }}>
              {collection.description}
            </p>
          )}
          <p className="mt-3 text-sm text-ink-2">
            {packs.length} pack{packs.length === 1 ? '' : 's'} in this collection
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-10 pb-20">
        {packs.length === 0 ? (
          <div className="text-center py-20 rounded-md border-2 border-dashed border-bdr bg-white">
            <p className="text-lg text-ink">No packs in this collection yet</p>
            <Link href="/packs" className="mt-2 inline-block text-em font-medium text-sm">
              ← Back to collections
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packs.map((pack) => (
              <Link
                key={pack.id}
                href={`/products/${pack.slug}`}
                className="flex flex-col overflow-hidden rounded-md border-2 border-bdr bg-white transition transform hover:-translate-y-1 hover:shadow-card"
              >
                <div className="relative aspect-square bg-gray-50">
                  {pack.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pack.image} alt={pack.name} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1 bg-white p-1">
                      {(pack.productImages.length ? pack.productImages.slice(0, 4) : [null]).map((src, i) => (
                        <div key={i} className="relative overflow-hidden rounded-sm bg-gray-50">
                          {src && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-base font-semibold text-ink leading-snug">{pack.name}</h3>
                  {pack.description && (
                    <p className="mt-1 text-xs text-ink-2 line-clamp-2">{pack.description}</p>
                  )}
                  <p className="mt-2 text-sm text-ink-2">
                    {pack.productCount} products
                    {pack.fromPrice > 0 && (
                      <span className="text-ink-3"> · From {formatRupees(pack.fromPrice)}/pack</span>
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
