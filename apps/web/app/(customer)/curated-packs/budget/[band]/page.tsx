import { notFound } from 'next/navigation';
import { getPacks, getBudgetBand, getBudgetBands } from '@/lib/pack-data';
import { bandContains } from '@/lib/budget-bands';
import { PacksBrowser } from '@/components/packs/packs-browser';
import { JsonLd } from '@/components/seo/json-ld';
import { itemListSchema, breadcrumbSchema } from '@/lib/schema';

// ISR: cacheable HTML for crawlers + users, refreshed hourly.
export const revalidate = 3600;

// Every active band pre-renders at build; a band added later is served on
// demand and picked up by the next revalidation.
export async function generateStaticParams() {
  const bands = await getBudgetBands();
  return bands.map((b) => ({ band: b.slug }));
}

export async function generateMetadata({ params }: { params: { band: string } }) {
  const band = await getBudgetBand(params.band);
  if (!band) return { title: 'Budget not found', robots: { index: false, follow: false } };

  const path = `/curated-packs/budget/${band.slug}`;
  const title = `Corporate Gift Packs ${band.name}`;
  return {
    // Root template appends "· GIVOO"
    title,
    description: band.description ?? undefined,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      url: path,
      title,
      description: band.description ?? undefined,
      siteName: 'GIVOO',
      locale: 'en_IN',
    },
    twitter: { card: 'summary_large_image', title, description: band.description ?? undefined },
  };
}

// Level 3 of the budget branch: every pack whose "from" price lands in the
// band, in the same browser (filters, sort, cards) the collection pages used.
export default async function BudgetBandPage({ params }: { params: { band: string } }) {
  const [band, all] = await Promise.all([getBudgetBand(params.band), getPacks()]);
  if (!band) notFound();

  const packs = all.filter((p) => bandContains(band, p.fromPrice));

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
          { name: 'By Budget', path: '/curated-packs/budget' },
          { name: band.name, path: `/curated-packs/budget/${band.slug}` },
        ])}
      />
      <PacksBrowser
        packs={packs}
        scope={{
          title: band.name,
          description: band.description,
          breadcrumb: [
            { name: 'Curated Packs', href: '/curated-packs' },
            { name: 'By Budget', href: '/curated-packs/budget' },
          ],
          backHref: '/curated-packs/budget',
          backLabel: 'All Budgets',
        }}
      />
    </>
  );
}
