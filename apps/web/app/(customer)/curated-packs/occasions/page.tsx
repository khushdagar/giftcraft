import type { Metadata } from 'next';
import { getPacks, getPackOccasionTiles } from '@/lib/pack-data';
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

const PATH = '/curated-packs/occasions';

// Heading, blurb and SEO come from /admin/occasions/page-content.
export async function generateMetadata(): Promise<Metadata> {
  const content = await getCuratedHubContent('occasions');
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

// Level 2 of the occasion branch: every occasion that actually holds packs.
export default async function OccasionsHubPage() {
  const [packs, content] = await Promise.all([getPacks(), getCuratedHubContent('occasions')]);
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

  const belowHtml = toRichHtml(content.contentBelow);

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
      <ContentSection heading="About gifting by occasion" bodyHtml={belowHtml} />
      <FaqSection heading="Gifting by occasion" faqs={content.faqs} />
    </>
  );
}
