import { notFound } from 'next/navigation';
import { getBudgetBand, getBudgetBands } from '@/lib/pack-data';
import { queryPacks, scopedPacks, type PackScope } from '@/lib/pack-query';
import { PacksBrowser } from '@/components/packs/packs-browser';
import { JsonLd } from '@/components/seo/json-ld';
import { itemListSchema, breadcrumbSchema, faqPageSchema } from '@/lib/schema';
import { toRichHtml } from '@/lib/rich-text';
import { stripHtml } from '@/lib/strip-html';
import { ContentSection } from '@/components/seo/content-section';
import { FaqSection } from '@/components/seo/faq-section';

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
  const title = band.metaTitle || `Corporate Gift Packs ${band.name}`;
  const description = band.metaDescription || band.description || undefined;
  return {
    // Root template appends "· GIVOO"
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      url: path,
      title,
      description,
      siteName: 'GIVOO',
      locale: 'en_IN',
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

// Level 3 of the budget branch: every pack whose "from" price lands in the
// band, in the same browser (filters, sort, cards) the collection pages used.
export default async function BudgetBandPage({ params }: { params: { band: string } }) {
  const scope: PackScope = { kind: 'budget', slug: params.band };
  // `packs` stays on the server for the schema block; only `initialPage` — the
  // first 48 cards — is serialised into the HTML the browser downloads.
  const [band, packs, initialPage] = await Promise.all([
    getBudgetBand(params.band),
    scopedPacks(scope),
    queryPacks(scope),
  ]);
  if (!band) notFound();

  const belowHtml = toRichHtml(band.contentBelow);

  return (
    <>
      <JsonLd
        data={itemListSchema(
          // Capped like /catalog: an ItemList of hundreds of entries adds
          // hundreds of KB to the HTML and tells Google nothing extra.
          packs.slice(0, 50).map((p) => ({
            name: p.name,
            path: `/products/${p.slug}`,
            // A pack rarely has its own photo — fall back to a member
            // product's image so the schema never omits `image` (Google flags
            // a Product node with no image as invalid structured data).
            image: p.image ?? p.productImages.find(Boolean) ?? null,
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
      {band.faqs.length > 0 && (
        <JsonLd
          data={faqPageSchema(
            band.faqs.map((f) => ({ question: f.question, answer: stripHtml(f.answer) }))
          )}
        />
      )}
      <PacksBrowser
        source={scope}
        initialPage={initialPage}
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
      <ContentSection heading={`About ${band.name}`} bodyHtml={belowHtml} />
      <FaqSection heading={band.name} faqs={band.faqs} />
    </>
  );
}
