import type { Metadata } from 'next';
import Link from 'next/link';
import { getCategorySummaries, type CategorySummary } from '@/lib/category-data';
import { JsonLd } from '@/components/seo/json-ld';
import { CollapsibleRichText } from '@/components/catalog/collapsible-rich-text';
import { breadcrumbSchema, collectionPageSchema } from '@/lib/schema';
import { withPageSeo } from '@/lib/page-seo';

// Fully server-rendered: this page is the crawlable hub linking the site root
// to every category, and from there to every product.
export const revalidate = 3600;

// Shown when a category has no cover image uploaded in the admin.
const PLACEHOLDER_IMAGE = '/placeholder-tile.svg';

// Page intro, as HTML so CollapsibleRichText can word-count and clamp it.
const INTRO_HTML = `<p>Every category below is priced per unit with standard branding already included — no separate printing charge, and the rate steps down as your quantity grows. Pick a category to see live pricing, or <a href="/builder" class="font-semibold text-em underline">build a gift pack</a> from across the range.</p>`;

export function generateMetadata(): Promise<Metadata> {
  return withPageSeo('/categories', baseMetadata);
}

const baseMetadata: Metadata = {
  // Root template appends "· GIVOO"
  title: 'Shop Corporate Gifts by Category',
  description:
    'Browse bulk corporate gifting by category — drinkware, tech, bags, stationery, gourmet hampers, apparel and more. Branding included in every per-unit price.',
  alternates: { canonical: '/categories' },
  openGraph: {
    type: 'website',
    url: '/categories',
    title: 'Shop Corporate Gifts by Category',
    description:
      'Browse bulk corporate gifting by category — drinkware, tech, bags, stationery, gourmet hampers, apparel and more.',
    siteName: 'GIVOO',
    locale: 'en_IN',
  },
};

/**
 * One browse tile — the same image-card treatment as the homepage tiles.
 * Used for both departments and their sub-categories.
 */
function CategoryTile({ category, label }: { category: CategorySummary; label?: string }) {
  // Cover photo, else the top product's image (featured first), else the brand
  // tile — so a category never shows a bare placeholder just because no cover
  // was uploaded in the admin. Sub-categories rely on this fallback today.
  const cover = category.imageUrl || category.previewImages[0] || PLACEHOLDER_IMAGE;
  return (
    <Link
      href={`/category/${category.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-md transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[3/2] overflow-hidden bg-elevated">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <h3 className="font-serif text-2xl font-normal">{label ?? category.name}</h3>
        </div>
      </div>
    </Link>
  );
}

export default async function CategoriesPage() {
  const categories = await getCategorySummaries();

  return (
    <div className="min-h-screen bg-canvas">
      <JsonLd
        data={collectionPageSchema({
          name: 'Corporate Gift Categories',
          description:
            'Bulk corporate gifting categories on GIVOO, from drinkware and tech to gourmet hampers and apparel.',
          path: '/categories',
          // Sub-categories are listed too, so the structured data matches the
          // links actually on the page.
          items: categories.flatMap((c) => [c, ...c.children]).map((c) => ({
            name: c.name,
            path: `/category/${c.slug}`,
          })),
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Categories', path: '/categories' },
        ])}
      />

      <div className="container-gc-w py-12 md:py-16">
        <nav aria-label="Breadcrumb" className="text-xs text-ink-3">
          <Link href="/" className="text-em hover:underline">
            Home
          </Link>{' '}
          / <span>Categories</span>
        </nav>

        <header className="mt-4 max-w-7xl">
          <h1 className="mt-1 font-serif text-4xl font-light tracking-tight text-ink md:text-5xl">
            Shop corporate gifts by category
          </h1>
          {/* Same 15-word "Read more" treatment as the category page intros. */}
          <CollapsibleRichText
            className="mt-4 text-base leading-relaxed text-ink-2"
            html={INTRO_HTML}
          />
        </header>

        {/* One section per department: its own tile first, then every
            populated sub-category, so the page links to the whole tree. */}
        {categories.length === 0 ? (
          <div className="mt-12 rounded-md border-2 border-dashed border-bdr bg-white py-20 text-center">
            <p className="text-lg text-ink">Categories are being updated</p>
            <Link href="/catalog" className="mt-2 inline-block text-sm font-medium text-em">
              Browse all products →
            </Link>
          </div>
        ) : (
          <div className="mt-10 space-y-12">
            {categories.map((category) => (
              <section key={category.id} aria-labelledby={`cat-${category.slug}`}>
                <div className="flex items-baseline justify-between gap-4">
                  <h2 id={`cat-${category.slug}`} className="font-serif text-2xl font-normal text-ink">
                    {category.name}
                  </h2>
                  <Link
                    href={`/category/${category.slug}`}
                    className="shrink-0 text-sm font-semibold text-em hover:underline"
                  >
                    Shop all <span aria-hidden>→</span>
                  </Link>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {/* The department itself leads, then its sub-categories. */}
                  <CategoryTile category={category} label={`All ${category.name}`} />
                  {category.children.map((child) => (
                    <CategoryTile key={child.id} category={child} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
