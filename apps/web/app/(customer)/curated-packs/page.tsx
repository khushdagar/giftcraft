import { getPackCollections, getCollectionTiles } from '@/lib/pack-data';
import { PacksBrowser } from '@/components/packs/packs-browser';
import { JsonLd } from '@/components/seo/json-ld';
import { breadcrumbSchema, collectionPageSchema } from '@/lib/schema';

// ISR: cacheable HTML for crawlers + users, refreshed hourly.
export const revalidate = 3600;

export const metadata = {
  title: 'Curated Gift Packs', // root template appends "· GIVOO"
  description:
    'Every curated corporate gift pack in one place — filter by category, brand, occasion, recipient and budget. Branding included in every per-unit price.',
  alternates: { canonical: '/curated-packs' },
  openGraph: {
    type: 'website',
    url: '/curated-packs',
    title: 'Curated Gift Packs',
    description:
      'Every curated corporate gift pack in one place — filter by category, brand, occasion, recipient and budget.',
    siteName: 'GIVOO',
    locale: 'en_IN',
  },
};

// Lists every pack from every collection. `?collection=<slug>` pre-selects one
// collection in the sidebar (used by the navbar and footer links).
export default async function CuratedPacksPage() {
  // `collections` feeds the filter sidebar and the flat pack list (every level
  // of the tree); `tiles` is level 1 only, so a sub-collection never appears
  // beside its own parent on the hub.
  const [collections, tiles] = await Promise.all([getPackCollections(), getCollectionTiles(null)]);
  const packs = collections.flatMap((c) => c.packs);

  return (
    <>
      <JsonLd
        data={collectionPageSchema({
          name: 'Curated Corporate Gift Packs',
          description:
            'Every curated corporate gift pack on GIVOO, ready to customise with your branding.',
          path: '/curated-packs',
          items: packs.map((p) => ({ name: p.name, path: `/products/${p.slug}` })),
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Curated Packs', path: '/curated-packs' },
        ])}
      />
      <PacksBrowser
        collections={collections}
        tiles={tiles.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          image: t.image,
          gradient: t.gradient,
          childCount: t.childCount,
          href: `/curated-packs/${t.slug}`,
        }))}
      />
    </>
  );
}
