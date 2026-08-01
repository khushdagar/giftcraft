import type { Metadata } from 'next';
import Link from 'next/link';
import { getCategorySummaries } from '@/lib/category-data';
import { categoryCopy } from '@/lib/category-content';
import { formatRupees } from '@/lib/utils';
import { JsonLd } from '@/components/seo/json-ld';
import { breadcrumbSchema, collectionPageSchema } from '@/lib/schema';

// Fully server-rendered: this page is the crawlable hub linking the site root
// to every category, and from there to every product.
export const revalidate = 3600;

export const metadata: Metadata = {
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
          items: categories.map((c) => ({ name: c.name, path: `/categories/${c.slug}` })),
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

        <header className="mt-4 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-3">Browse</p>
          <h1 className="mt-1 font-serif text-4xl font-light tracking-tight text-ink md:text-5xl">
            Shop corporate gifts by category
          </h1>
          <p className="mt-4 text-base leading-relaxed text-ink-2">
            Every category below is priced per unit with standard branding already included — no
            separate printing charge, and the rate steps down as your quantity grows. Pick a
            category to see live pricing, or{' '}
            <Link href="/builder" className="font-semibold text-em underline">
              build a gift pack
            </Link>{' '}
            from across the range.
          </p>
        </header>

        {categories.length === 0 ? (
          <div className="mt-12 rounded-md border-2 border-dashed border-bdr bg-white py-20 text-center">
            <p className="text-lg text-ink">Categories are being updated</p>
            <Link href="/catalog" className="mt-2 inline-block text-sm font-medium text-em">
              Browse all products →
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const blurb = category.description || categoryCopy(category.slug, category.name).intro;
              return (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="group flex flex-col overflow-hidden rounded-md border-2 border-bdr bg-white transition hover:-translate-y-1 hover:shadow-card"
                >
                  {/* Collage of real products from the category. Decorative —
                      the category name below is the accessible label. */}
                  <div className="grid aspect-[4/3] grid-cols-2 grid-rows-2 gap-1 bg-gray-50 p-1">
                    {(category.previewImages.length
                      ? category.previewImages.slice(0, 4)
                      : [null]
                    ).map((src, i) => (
                      <div
                        key={i}
                        className={`relative overflow-hidden rounded-sm bg-elevated ${
                          category.previewImages.length === 1 ? 'col-span-2 row-span-2' : ''
                        }`}
                      >
                        {src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={src}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-3xl opacity-50">
                            🎁
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="font-serif text-xl font-normal text-ink transition group-hover:text-em">
                      {category.name}
                    </h2>
                    <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-2">
                      {blurb}
                    </p>
                    <p className="mt-4 text-sm text-ink-3">
                      {category.productCount} product{category.productCount === 1 ? '' : 's'}
                      {category.fromPrice !== null && (
                        <span> · From {formatRupees(category.fromPrice)}/unit</span>
                      )}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
