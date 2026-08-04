import { getPackCollections } from '@/lib/pack-data';
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
  const collections = await getPackCollections();
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
      <PacksBrowser collections={collections} />
    </>
  );
}
