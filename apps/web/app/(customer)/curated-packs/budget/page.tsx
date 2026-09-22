import type { Metadata } from 'next';
import { getPacks, getBudgetTiles } from '@/lib/pack-data';
import { getCuratedHubContent } from '@/lib/curated-hub-content';
import { CollectionLevelPage } from '@/components/packs/collection-level-page';
import { JsonLd } from '@/components/seo/json-ld';
import { breadcrumbSchema, itemListSchema, faqPageSchema } from '@/lib/schema';
import { withPageSeo } from '@/lib/page-seo';
import { toRichHtml } from '@/lib/rich-text';
import { stripHtml } from '@/lib/strip-html';
import { ContentSection } from '@/components/seo/content-section';
import { FaqSection } from '@/components/seo/faq-section';

// ISR: cacheable HTML for crawlers + users, refreshed hourly.
export const revalidate = 3600;

const PATH = '/curated-packs/budget';

// Heading, blurb and SEO come from /admin/budget-bands/page-content.
export async function generateMetadata(): Promise<Metadata> {
  const content = await getCuratedHubContent('budget');
  const title = content.metaTitle || content.pageTitle;
  const description = content.metaDescription || content.description;
  return withPageSeo(PATH, {
    title, // Title is used as-is (no brand suffix is appended)
    description,
    alternates: { canonical: PATH },
    openGraph: {
      type: 'website',
      url: PATH,
      title,
      description,
      siteName: 'GIVOO',
      locale: 'en_IN',
    },
  });
}

// Level 2 of the budget branch: the price bands that actually hold packs.
export default async function BudgetHubPage() {
  const [packs, content] = await Promise.all([getPacks(), getCuratedHubContent('budget')]);
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

  const belowHtml = toRichHtml(content.contentBelow);

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
      {content.faqs.length > 0 && (
        <JsonLd
          data={faqPageSchema(
            content.faqs.map((f) => ({ question: f.question, answer: stripHtml(f.answer) }))
          )}
        />
      )}
      <CollectionLevelPage
        title={content.pageTitle}
        description={content.description}
        breadcrumb={[{ name: 'Curated Packs', href: '/curated-packs' }]}
        backHref="/curated-packs"
        backLabel="Curated Packs"
        tiles={tiles}
      />
      <ContentSection heading="About gifting by budget" bodyHtml={belowHtml} />
      <FaqSection heading="Gifting by budget" faqs={content.faqs} />
    </>
  );
}
