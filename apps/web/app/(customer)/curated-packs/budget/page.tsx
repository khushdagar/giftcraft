import type { Metadata } from 'next';
import { getPacks, getBudgetTiles } from '@/lib/pack-data';
import { CollectionLevelPage } from '@/components/packs/collection-level-page';
import { JsonLd } from '@/components/seo/json-ld';
import { breadcrumbSchema, itemListSchema } from '@/lib/schema';
import { withPageSeo } from '@/lib/page-seo';

// ISR: cacheable HTML for crawlers + users, refreshed hourly.
export const revalidate = 3600;

const PATH = '/curated-packs/budget';
const TITLE = 'Gift Packs by Budget';
const DESCRIPTION =
  'Corporate gift packs grouped by per-unit budget — from under ₹500 to premium hampers above ₹5,000.';

export function generateMetadata(): Promise<Metadata> {
  return withPageSeo('/curated-packs/budget', baseMetadata);
}

const baseMetadata: Metadata = {
  title: TITLE, // root template appends "· GIVOO"
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    type: 'website',
    url: PATH,
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'GIVOO',
    locale: 'en_IN',
  },
};

// Level 2 of the budget branch: the price bands that actually hold packs.
export default async function BudgetHubPage() {
  const packs = await getPacks();
  const bands = await getBudgetTiles(packs);

  const tiles = bands.map((b) => ({
    id: b.band.slug,
    name: b.band.name,
    slug: b.band.slug,
    // Set in /admin/budget-bands. With neither, the grid's own gradient
    // rotation still gives each tile a distinct face.
    image: b.band.image,
    gradient: b.band.gradient,
    href: `${PATH}/${b.band.slug}`,
    caption: `${b.count} pack${b.count === 1 ? '' : 's'}`,
    cta: 'Browse Packs →',
  }));

  return (
    <>
      <JsonLd data={itemListSchema(tiles.map((t) => ({ name: t.name, path: t.href })))} />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Curated Packs', path: '/curated-packs' },
          { name: 'By Budget', path: PATH },
        ])}
      />
      <CollectionLevelPage
        title="By Budget"
        description="Every price shown is the per-pack rate at the corporate minimum, with branding already included."
        breadcrumb={[{ name: 'Curated Packs', href: '/curated-packs' }]}
        backHref="/curated-packs"
        backLabel="Curated Packs"
        tiles={tiles}
      />
    </>
  );
}
