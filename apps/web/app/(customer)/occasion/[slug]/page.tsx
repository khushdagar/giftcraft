import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOccasionBySlug, getOccasionNav } from '@/lib/occasion-data';
import { getCatalogProducts, getCatalogFilters } from '@/lib/catalog-data';
import { occasionCopy } from '@/lib/occasion-content';
import { toMetaDescription } from '@/lib/category-content';
import { toRichHtml } from '@/lib/rich-text';
import { stripHtml } from '@/lib/strip-html';
import { CatalogClient } from '@/components/catalog/catalog-client';
import { ViewTracker } from '@/components/analytics/view-tracker';
import { JsonLd } from '@/components/seo/json-ld';
import { breadcrumbSchema, collectionPageSchema } from '@/lib/schema';

// Server-rendered + ISR, for the same reasons as /category/[slug]: the product
// grid (and every product link in it) is in the initial HTML, and no
// generateStaticParams so the build does not open a connection per occasion.
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const occasion = await getOccasionBySlug(params.slug);
  if (!occasion) return { title: 'Occasion not found', robots: { index: false, follow: false } };

  const copy = occasionCopy(occasion.name, occasion.isCollection);
  // An admin description wins, but stripped of its markup and clamped — it's
  // authored as rich text page copy, not as a 155-character meta description.
  const adminText = stripHtml(occasion.description);
  const description = adminText ? toMetaDescription(adminText) : copy.meta;
  const url = `/occasion/${occasion.slug}`;
  const ogImage = occasion.products.find((p) => p.imageUrl)?.imageUrl || '/opengraph-image';

  return {
    // Root template appends "· GIVOO"
    title: copy.title,
    description,
    alternates: { canonical: url },
    // An empty occasion is a real page but has nothing to rank — keep it out of
    // the index until it has stock, while still letting Google follow its links.
    ...(occasion.productCount === 0 ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: 'website',
      url,
      title: copy.title,
      description,
      siteName: 'GIVOO',
      locale: 'en_IN',
      images: [{ url: ogImage, alt: `${occasion.name} corporate gifts` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.title,
      description,
      images: [ogImage],
    },
  };
}

export default async function OccasionPage({ params }: { params: { slug: string } }) {
  const occasion = await getOccasionBySlug(params.slug);
  if (!occasion) notFound();

  // The catalog UI needs the full product shape (variants, occasions, tags) and
  // the shared filter facets — fetched scoped to this occasion so the page never
  // pulls the whole catalogue just to display one slice of it.
  const [products, filters, siblings] = await Promise.all([
    getCatalogProducts(1000, undefined, { id: occasion.id, tags: occasion.tags }),
    getCatalogFilters(),
    getOccasionNav(occasion.isCollection),
  ]);

  const copy = occasionCopy(occasion.name, occasion.isCollection);
  // The admin description is rich text (HTML) and must be sanitized here, on the
  // server, before it is handed to a client component to render.
  const intro = occasion.description?.trim() || copy.intro;
  const introHtml = toRichHtml(intro);
  // JSON-LD takes plain text — schema.org descriptions must not contain markup.
  const introText = stripHtml(intro);
  const belowHtml = toRichHtml(occasion.contentBelow);
  const others = siblings.filter((o) => o.slug !== occasion.slug);
  const hubLabel = occasion.isCollection ? 'Collections' : 'Occasions';

  return (
    <>
      {/* Popularity counter — ranks the occasion/collection tiles */}
      <ViewTracker type="occasion" id={occasion.id} />
      <JsonLd
        data={collectionPageSchema({
          name: copy.title,
          description: introText,
          path: `/occasion/${occasion.slug}`,
          items: occasion.products.map((p) => ({ name: p.name, path: `/products/${p.slug}` })),
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Occasions', path: '/occasions' },
          { name: occasion.name, path: `/occasion/${occasion.slug}` },
        ])}
      />

      {/* Same catalog experience — search, filters, sort, Add to Pack — scoped
          to this occasion, which also supplies the page's H1 and intro copy. */}
      <CatalogClient
        occasion={{
          id: occasion.id,
          name: occasion.name,
          slug: occasion.slug,
          isCollection: occasion.isCollection,
          descriptionHtml: introHtml,
        }}
        initialProducts={products as any[]}
        initialFilters={filters}
      />

      {belowHtml && (
        <section aria-label={`About ${occasion.name}`} style={{ background: '#F5F1EB' }}>
          <div className="max-w-7xl mx-auto px-4 md:px-10 pb-16">
            <div
              className="blog-content max-w-7xl border-t border-bdr pt-10"
              dangerouslySetInnerHTML={{ __html: belowHtml }}
            />
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section
          aria-label={`Other ${hubLabel.toLowerCase()}`}
          className="pb-20"
          style={{ background: '#F5F1EB' }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-10">
            <div className="border-t border-bdr pt-8">
              <h2 className="text-xl font-black tracking-tight text-ink">Other {hubLabel.toLowerCase()}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {others.map((sibling) => (
                  <Link
                    key={sibling.id}
                    href={`/occasion/${sibling.slug}`}
                    className="rounded-full border-2 border-bdr bg-white px-4 py-1.5 text-sm font-medium text-ink-2 transition hover:border-em hover:text-em"
                  >
                    {sibling.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
