import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getPackCollections, getCollectionTiles } from '@/lib/pack-data';
import { PacksBrowser } from '@/components/packs/packs-browser';
import { CollectionLevelPage } from '@/components/packs/collection-level-page';
import { JsonLd } from '@/components/seo/json-ld';
import { itemListSchema, breadcrumbSchema } from '@/lib/schema';

// ISR: cacheable HTML for crawlers + users, refreshed hourly.
export const revalidate = 3600;

// Every active top-level collection gets its own crawlable URL, pre-rendered at
// build. Sub-collections live one segment deeper and are handled by
// [collection]/[sub], so they are excluded here.
export async function generateStaticParams() {
  const collections = await prisma.giftCollection.findMany({
    where: { isActive: true, parentId: null },
    select: { slug: true },
  });
  return collections.map((c) => ({ collection: c.slug }));
}

export async function generateMetadata({ params }: { params: { collection: string } }) {
  const collection = await prisma.giftCollection.findUnique({
    where: { slug: params.collection },
    select: { name: true, description: true, isActive: true, image: true, _count: { select: { children: true } } },
  });
  if (!collection || !collection.isActive)
    return { title: 'Collection not found', robots: { index: false, follow: false } };
  const hasChildren = collection._count.children > 0;
  const description =
    collection.description ||
    (hasChildren
      ? `Browse the collections inside ${collection.name}.`
      : `Curated corporate gift packs in the ${collection.name} collection.`);
  const ogImage = collection.image || '/opengraph-image';
  const title = hasChildren ? `${collection.name} Collections` : `${collection.name} Gift Packs`;
  return {
    // Root template appends "· GIVOO"
    title,
    description,
    alternates: { canonical: `/curated-packs/${params.collection}` },
    openGraph: {
      type: 'website',
      url: `/curated-packs/${params.collection}`,
      title,
      description,
      siteName: 'GIVOO',
      locale: 'en_IN',
      images: [{ url: ogImage, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

// Two shapes behind one URL:
//   • the collection has sub-collections → show those tiles (level 2 of 3)
//   • it has none                        → show its packs, exactly as before
// The second branch is what every pre-existing collection hits, so nothing
// about the old behaviour changes until an admin adds a child.
export default async function CollectionDetailPage({
  params,
}: {
  params: { collection: string };
}) {
  const record = await prisma.giftCollection.findUnique({
    where: { slug: params.collection },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      parent: { select: { slug: true } },
    },
  });

  if (!record || !record.isActive) {
    notFound();
  }

  // A sub-collection has exactly one canonical URL — the nested one. Reaching
  // it at the top level (an old bookmark, a hand-typed URL) redirects there
  // rather than serving the same page under two addresses.
  if (record.parent) {
    redirect(`/curated-packs/${record.parent.slug}/${params.collection}`);
  }

  const children = await getCollectionTiles(record.id);

  if (children.length > 0) {
    return (
      <>
        <JsonLd
          data={itemListSchema(
            children.map((c) => ({
              name: c.name,
              path: `/curated-packs/${params.collection}/${c.slug}`,
              image: c.image,
            }))
          )}
        />
        <JsonLd
          data={breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Curated Packs', path: '/curated-packs' },
            { name: record.name, path: `/curated-packs/${params.collection}` },
          ])}
        />
        <CollectionLevelPage
          title={record.name}
          description={record.description}
          breadcrumb={[{ name: 'Curated Packs', href: '/curated-packs' }]}
          backHref="/curated-packs"
          backLabel="All Collections"
          tiles={children.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            image: c.image,
            gradient: c.gradient,
            href: `/curated-packs/${params.collection}/${c.slug}`,
          }))}
        />
      </>
    );
  }

  // Same browser as /curated-packs — filter sidebar (with every collection
  // listed so you can switch) and the standard pack cards — pre-filtered.
  const collections = await getPackCollections();
  const packs = collections.find((c) => c.id === record.id)?.packs ?? [];

  return (
    <>
      <JsonLd
        data={itemListSchema(
          packs.map((p) => ({
            name: p.name,
            path: `/products/${p.slug}`,
            image: p.image,
            // Sum of the members' cheapest slabs — the pack's "from" price.
            price: p.fromPrice,
          }))
        )}
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
