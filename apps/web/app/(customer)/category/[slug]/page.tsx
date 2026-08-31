import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCategoryBySlug, getCategoryNav } from '@/lib/category-data';
import { getCatalogProducts, getCatalogFilters } from '@/lib/catalog-data';
import { categoryCopy, toMetaDescription } from '@/lib/category-content';
import { toRichHtml } from '@/lib/rich-text';
import { stripHtml } from '@/lib/strip-html';
import { CatalogClient } from '@/components/catalog/catalog-client';
import { JsonLd } from '@/components/seo/json-ld';
import { ContentSection } from '@/components/seo/content-section';
import { FaqSection } from '@/components/seo/faq-section';
import { breadcrumbSchema, collectionPageSchema, faqPageSchema } from '@/lib/schema';

// Server-rendered + ISR: the product grid (and every product link in it) is in
// the initial HTML, and the page is cached between revalidations.
//
// Deliberately NO generateStaticParams: prerendering every category at build
// time piles concurrent Postgres connections onto the build (which has hit
// "too many connections" and failed outright). Rendering on demand keeps ISR
// caching and guarantees a live DB connection, so a page can never be cached
// with an empty product grid.
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug);
  if (!category) return { title: 'Category not found', robots: { index: false, follow: false } };

  const copy = categoryCopy(category.slug, category.name);
  // An admin meta description wins outright; failing that, the admin's page
  // description (rich text page copy, so stripped and clamped) stands in;
  // only a brand-new category with neither falls back to the generic template.
  const adminText = stripHtml(category.description);
  const title = category.metaTitle || `${category.name} — Bulk Corporate Gifts`;
  const description = category.metaDescription || (adminText ? toMetaDescription(adminText) : copy.meta);
  const url = `/category/${category.slug}`;
  // Real product shot when the category has one, else the branded site card —
  // a link preview should never come back blank.
  const ogImage = category.products.find((p) => p.imageUrl)?.imageUrl || '/opengraph-image';

  return {
    // Root template appends "· GIVOO"
    title,
    description,
    alternates: { canonical: url },
    // An empty category is a real page but has nothing to rank — keep it out of
    // the index until it has stock, while still letting Google follow its links.
    ...(category.products.length === 0 ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: 'GIVOO',
      locale: 'en_IN',
      images: [{ url: ogImage, alt: `${category.name} corporate gifts` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = await getCategoryBySlug(params.slug);
  if (!category) notFound();

  // The catalog UI needs the full product shape (variants, occasions, tags) and
  // the shared filter facets — fetched scoped to this category so the page
  // never pulls the whole catalogue just to display one slice of it.
  const [products, filters, siblings] = await Promise.all([
    getCatalogProducts(1000, category.id),
    getCatalogFilters(),
    getCategoryNav(),
  ]);

  // The admin description is rich text (HTML) and must be sanitized here, on
  // the server, before it is handed to a client component to render. The
  // editorial fallback is plain text, so toRichHtml wraps it in a <p>.
  const intro = category.description?.trim() || categoryCopy(category.slug, category.name).intro;
  const introHtml = toRichHtml(intro);
  // JSON-LD takes plain text — schema.org descriptions must not contain markup.
  const introText = stripHtml(intro);
  const belowHtml = toRichHtml(category.contentBelow);
  const otherCategories = siblings.filter((c) => c.slug !== category.slug);
  const pageTitle = category.metaTitle || `${category.name} — Bulk Corporate Gifts`;

  return (
    <>
      <JsonLd
        data={collectionPageSchema({
          name: pageTitle,
          description: introText,
          path: `/category/${category.slug}`,
          // `price` is the same cheapest-slab figure the cards render.
          items: category.products.map((p) => ({
            name: p.name,
            path: `/products/${p.slug}`,
            image: p.imageUrl,
            brand: p.brand,
            price: p.price,
          })),
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Categories', path: '/categories' },
          { name: category.name, path: `/category/${category.slug}` },
        ])}
      />
      {category.faqs.length > 0 && (
        <JsonLd
          data={faqPageSchema(
            category.faqs.map((f) => ({ question: f.question, answer: stripHtml(f.answer) }))
          )}
        />
      )}

      {/* Same catalog experience — search, filters, sort, Add to Pack — scoped
          to this category, which also supplies the page's H1 and intro copy. */}
      <CatalogClient
        category={{
          id: category.id,
          name: category.name,
          slug: category.slug,
          descriptionHtml: introHtml,
        }}
        initialProducts={products as any[]}
        initialFilters={filters}
      />

      <ContentSection heading={`About ${category.name}`} bodyHtml={belowHtml} />
      <FaqSection heading={category.name} faqs={category.faqs} />

      {otherCategories.length > 0 && (
        <section
          aria-label="Other categories"
          className="pb-20"
          style={{ background: '#F5F1EB' }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-10">
            <div className="border-t border-bdr pt-8">
              <h2 className="text-xl font-black tracking-tight text-ink">Other categories</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {otherCategories.map((sibling) => (
                  <Link
                    key={sibling.id}
                    href={`/category/${sibling.slug}`}
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
