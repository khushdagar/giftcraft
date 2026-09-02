import type { Metadata } from 'next';
import { getPacks, getBudgetTiles, getPackOccasionTiles } from '@/lib/pack-data';
import { getCuratedPackEntries } from '@/lib/curated-pack-entries';
import { CollectionLevelPage } from '@/components/packs/collection-level-page';
import { JsonLd } from '@/components/seo/json-ld';
import { breadcrumbSchema, itemListSchema } from '@/lib/schema';
import { withPageSeo } from '@/lib/page-seo';

// ISR: cacheable HTML for crawlers + users, refreshed hourly.
export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return withPageSeo('/curated-packs', baseMetadata);
}

const baseMetadata: Metadata = {
  title: 'Curated Gift Packs', // root template appends "· GIVOO"
  description:
    'Browse curated corporate gift packs by budget or by occasion. Branding included in every per-unit price.',
  alternates: { canonical: '/curated-packs' },
  openGraph: {
    type: 'website',
    url: '/curated-packs',
    title: 'Curated Gift Packs',
    description: 'Browse curated corporate gift packs by budget or by occasion.',
    siteName: 'GIVOO',
    locale: 'en_IN',
  },
};

// The hub offers exactly two ways in — budget and occasion. Gift collections
// are no longer a customer-facing rung; they remain an admin grouping only.
export default async function CuratedPacksPage() {
  const packs = await getPacks();
  const [budgets, occasions, entries] = await Promise.all([
    getBudgetTiles(packs),
    getPackOccasionTiles(packs),
    getCuratedPackEntries(),
  ]);
  const entry = (slug: string) => entries.find((e) => e.slug === slug)!;

  // Artwork and blurb come from /admin/settings/curated-packs; the caption is
  // always live, so a tile never over- or under-promises what's behind it.
  const tiles = [
    {
      id: 'budget',
      ...entry('budget'),
      href: '/curated-packs/budget',
      caption: `${budgets.length} price band${budgets.length === 1 ? '' : 's'} · from under ₹500`,
      cta: 'Browse Budgets →',
    },
    {
      id: 'occasions',
      ...entry('occasions'),
      href: '/curated-packs/occasions',
      caption: `${occasions.length} occasion${occasions.length === 1 ? '' : 's'} to shop`,
      cta: 'Browse Occasions →',
    },
  ];

  return (
    <>
      <JsonLd data={itemListSchema(tiles.map((t) => ({ name: t.name, path: t.href })))} />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Curated Packs', path: '/curated-packs' },
        ])}
      />
      <CollectionLevelPage
        title="Curated Packs"
        description={`${packs.length} hand-picked gift assortments — pick a budget, or shop by the moment you're gifting for.`}
        breadcrumb={[]}
        backHref="/catalog"
        backLabel="All Products"
        tiles={tiles}
      />
    </>
  );
}
