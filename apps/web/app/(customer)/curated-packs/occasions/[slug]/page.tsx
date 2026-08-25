import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getPacks } from '@/lib/pack-data';
import { PacksBrowser } from '@/components/packs/packs-browser';
import { JsonLd } from '@/components/seo/json-ld';
import { itemListSchema, breadcrumbSchema, faqPageSchema } from '@/lib/schema';
import { toRichHtml } from '@/lib/rich-text';
import { stripHtml } from '@/lib/strip-html';
import { ContentSection } from '@/components/seo/content-section';
import { FaqSection } from '@/components/seo/faq-section';

interface OccasionFaq {
  question: string;
  answer: string;
}

// ISR: cacheable HTML for crawlers + users, refreshed hourly.
export const revalidate = 3600;

// `isCollection` entries are the homepage's curated collections, not occasions,
// so they get no pack page here.
export async function generateStaticParams() {
  const occasions = await prisma.occasionConfig.findMany({
    where: { isActive: true, isCollection: false },
    select: { slug: true },
  });
  return occasions.map((o) => ({ slug: o.slug }));
}

async function loadOccasion(slug: string) {
  const occasion = await prisma.occasionConfig.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      packName: true,
      slug: true,
      imageUrl: true,
      isActive: true,
      isCollection: true,
      packDescription: true,
      packMetaTitle: true,
      packMetaDescription: true,
      packContentBelow: true,
      packFaqs: true,
    },
  });
  if (!occasion || !occasion.isActive || occasion.isCollection) return null;
  return {
    ...occasion,
    // The pack page's own H1/tile label — falls back to the shared name.
    displayName: occasion.packName || occasion.name,
    faqs: Array.isArray(occasion.packFaqs) ? (occasion.packFaqs as unknown as OccasionFaq[]) : [],
  };
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const occasion = await loadOccasion(params.slug);
  if (!occasion) return { title: 'Occasion not found', robots: { index: false, follow: false } };

  const path = `/curated-packs/occasions/${occasion.slug}`;
  const title = occasion.packMetaTitle || `${occasion.displayName} Gift Packs`;
  const description =
    occasion.packMetaDescription ||
    `Curated corporate gift packs for ${occasion.displayName} — bulk pricing with branding included in every per-unit rate.`;
  const ogImage = occasion.imageUrl || '/opengraph-image';
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
      images: [{ url: ogImage, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
  };
}

// Level 3 of the occasion branch: the packs filed under one occasion, in the
// same browser (filters, sort, cards) the collection pages used.
export default async function OccasionPacksPage({ params }: { params: { slug: string } }) {
  const [occasion, all] = await Promise.all([loadOccasion(params.slug), getPacks()]);

  if (!occasion) {
    notFound();
  }

  const packs = all.filter((p) => p.occasionSlugs.includes(occasion.slug));
  const belowHtml = toRichHtml(occasion.packContentBelow);

  return (
    <>
      <JsonLd
        data={itemListSchema(
          packs.map((p) => ({
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
          { name: 'By Occasion', path: '/curated-packs/occasions' },
          { name: occasion.displayName, path: `/curated-packs/occasions/${occasion.slug}` },
        ])}
      />
      {occasion.faqs.length > 0 && (
        <JsonLd
          data={faqPageSchema(
            occasion.faqs.map((f) => ({ question: f.question, answer: stripHtml(f.answer) }))
          )}
        />
      )}
      <PacksBrowser
        packs={packs}
        scope={{
          title: occasion.displayName,
          description:
            occasion.packDescription ||
            `Curated packs ready for ${occasion.displayName} — customise any of them with your branding.`,
          breadcrumb: [
            { name: 'Curated Packs', href: '/curated-packs' },
            { name: 'By Occasion', href: '/curated-packs/occasions' },
          ],
          backHref: '/curated-packs/occasions',
          backLabel: 'All Occasions',
        }}
      />
      <ContentSection heading={`About ${occasion.displayName}`} bodyHtml={belowHtml} />
      <FaqSection heading={occasion.displayName} faqs={occasion.faqs} />
    </>
  );
}
