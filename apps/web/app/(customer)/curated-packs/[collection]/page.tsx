import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getPackCollections } from '@/lib/pack-data';
import { PacksBrowser } from '@/components/packs/packs-browser';
import { JsonLd } from '@/components/seo/json-ld';
import { itemListSchema, breadcrumbSchema } from '@/lib/schema';

// ISR: cacheable HTML for crawlers + users, refreshed hourly.
export const revalidate = 3600;

// Every active collection gets its own crawlable URL, pre-rendered at build.
export async function generateStaticParams() {
  const collections = await prisma.giftCollection.findMany({
    where: { isActive: true },
    select: { slug: true },
  });
  return collections.map((c) => ({ collection: c.slug }));
}

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
    alternates: { canonical: `/curated-packs/${params.collection}` },
    openGraph: {
      type: 'website',
      url: `/curated-packs/${params.collection}`,
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

// Same browser as /curated-packs — filter sidebar (with every collection listed
// so you can switch) and the standard pack cards — pre-filtered to this one.
export default async function CollectionDetailPage({
  params,
}: {
  params: { collection: string };
}) {
  const [record, collections] = await Promise.all([
    prisma.giftCollection.findUnique({
      where: { slug: params.collection },
      select: { id: true, name: true, description: true, isActive: true },
    }),
    getPackCollections(),
  ]);

  if (!record || !record.isActive) {
    notFound();
  }

  const packs = collections.find((c) => c.id === record.id)?.packs ?? [];

  return (
    <>
      <JsonLd
        data={itemListSchema(packs.map((p) => ({ name: p.name, path: `/products/${p.slug}` })))}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Curated Packs', path: '/curated-packs' },
          { name: record.name, path: `/curated-packs/${params.collection}` },
        ])}
      />
      <PacksBrowser
        collections={collections}
        collection={{ id: record.id, name: record.name, description: record.description }}
      />
    </>
  );
}
