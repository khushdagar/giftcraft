import type { Metadata } from 'next';
import { getPacks, getPackOccasionTiles } from '@/lib/pack-data';
import { CollectionLevelPage } from '@/components/packs/collection-level-page';
import { JsonLd } from '@/components/seo/json-ld';
import { breadcrumbSchema, itemListSchema } from '@/lib/schema';
import { withPageSeo } from '@/lib/page-seo';

// ISR: cacheable HTML for crawlers + users, refreshed hourly.
export const revalidate = 3600;

const PATH = '/curated-packs/occasions';
const TITLE = 'Corporate Gifts by Occasion | Bulk Gift Packs - GIVOO';
const DESCRIPTION =
  'Shop corporate gifts by occasion — branded bulk packs for Diwali, onboarding, client & recognition gifting. Pay ₹0 until you approve your mockup.';

export function generateMetadata(): Promise<Metadata> {
  return withPageSeo('/curated-packs/occasions', baseMetadata);
}

const baseMetadata: Metadata = {
  title: TITLE, // Title is used as-is (no brand suffix is appended)
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

// Level 2 of the occasion branch: every occasion that actually holds packs.
export default async function OccasionsHubPage() {
  const packs = await getPacks();
  const occasions = await getPackOccasionTiles(packs);

  const tiles = occasions.map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    image: o.image,
    gradient: o.gradient,
    href: `${PATH}/${o.slug}`,
    caption: `${o.count} pack${o.count === 1 ? '' : 's'}`,
    cta: 'Browse Packs →',
  }));

  return (
    <>
      <JsonLd data={itemListSchema(tiles.map((t) => ({ name: t.name, path: t.href, image: t.image })))} />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Curated Packs', path: '/curated-packs' },
          { name: 'By Occasion', path: PATH },
        ])}
      />
      <CollectionLevelPage
        title="Corporate Gifts by Occasion | Bulk Gift Packs - GIVOO"
        description="Shop corporate gifts by occasion — branded bulk packs for Diwali, onboarding, client & recognition gifting. Pay ₹0 until you approve your mockup."
        breadcrumb={[{ name: 'Curated Packs', href: '/curated-packs' }]}
        backHref="/curated-packs"
        backLabel="Curated Packs"
        tiles={tiles}
      />
    </>
  );
}
