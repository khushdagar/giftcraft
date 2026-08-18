import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getPackCollections } from '@/lib/pack-data';
import { PacksBrowser } from '@/components/packs/packs-browser';
import { JsonLd } from '@/components/seo/json-ld';
import { itemListSchema, breadcrumbSchema } from '@/lib/schema';

// ISR: cacheable HTML for crawlers + users, refreshed hourly.
export const revalidate = 3600;

// Level 3 of the tree: the packs inside one sub-collection. Only children of a
// top-level collection are valid here — the tree is capped at two levels.
export async function generateStaticParams() {
  const subs = await prisma.giftCollection.findMany({
    where: { isActive: true, parent: { isActive: true } },
    select: { slug: true, parent: { select: { slug: true } } },
  });
  return subs.flatMap((s) =>
    s.parent ? [{ collection: s.parent.slug, sub: s.slug }] : []
  );
}

// Loads the sub-collection only when it really sits under `collection` — a
// mismatched pair is a 404, not a second URL for the same content.
async function loadSub(params: { collection: string; sub: string }) {
  const sub = await prisma.giftCollection.findUnique({
    where: { slug: params.sub },
    select: {
      id: true,
      name: true,
      description: true,
      image: true,
      isActive: true,
      parent: { select: { name: true, slug: true, isActive: true } },
    },
  });
  if (!sub || !sub.isActive) return null;
  if (!sub.parent || !sub.parent.isActive || sub.parent.slug !== params.collection) return null;
  return sub;
}

export async function generateMetadata({
  params,
}: {
  params: { collection: string; sub: string };
}) {
  const sub = await loadSub(params);
  if (!sub) return { title: 'Collection not found', robots: { index: false, follow: false } };

  const description =
    sub.description || `Curated corporate gift packs in the ${sub.name} collection.`;
  const ogImage = sub.image || '/opengraph-image';
  const path = `/curated-packs/${params.collection}/${params.sub}`;
  return {
    // Root template appends "· GIVOO"
    title: `${sub.name} Gift Packs`,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      url: path,
      title: `${sub.name} Gift Packs`,
      description,
      siteName: 'GIVOO',
      locale: 'en_IN',
      images: [{ url: ogImage, alt: `${sub.name} gift packs` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${sub.name} Gift Packs`,
      description,
      images: [ogImage],
    },
  };
}

export default async function SubCollectionPage({
  params,
}: {
  params: { collection: string; sub: string };
}) {
  const [sub, collections] = await Promise.all([loadSub(params), getPackCollections()]);

  if (!sub || !sub.parent) {
    notFound();
  }

  const packs = collections.find((c) => c.id === sub.id)?.packs ?? [];

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
          { name: sub.parent.name, path: `/curated-packs/${params.collection}` },
          { name: sub.name, path: `/curated-packs/${params.collection}/${params.sub}` },
        ])}
      />
      <PacksBrowser
        collections={collections}
        collection={{ id: sub.id, name: sub.name, description: sub.description }}
        parent={{ name: sub.parent.name, slug: sub.parent.slug }}
      />
    </>
  );
}
