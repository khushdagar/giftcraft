import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCategoryBySlug, getCategorySlugs, getCategorySummaries } from '@/lib/category-data';
import { categoryCopy, toMetaDescription } from '@/lib/category-content';
import { formatRupees } from '@/lib/utils';
import { cdnSrcSet } from '@/lib/cdn-srcset';
import { JsonLd } from '@/components/seo/json-ld';
import { breadcrumbSchema, collectionPageSchema } from '@/lib/schema';

// Server-rendered + ISR: the product grid (and every product link in it) is in
// the initial HTML, and the page is served from cache between revalidations.
export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getCategorySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug);
  if (!category) return { title: 'Category not found', robots: { index: false, follow: false } };

  const copy = categoryCopy(category.slug, category.name);
  // An admin description wins, but clamped — it's written as page copy, not as
  // a 155-character meta description.
  const description = category.description?.trim()
    ? toMetaDescription(category.description)
    : copy.meta;
  const url = `/categories/${category.slug}`;
  // Real product shot when the category has one, else the branded site card —
  // a link preview should never come back blank.
  const ogImage =
    category.products.find((p) => p.imageUrl)?.imageUrl || '/opengraph-image';

  return {
    // Root template appends "· GIVOO"
    title: `${category.name} — Bulk Corporate Gifts`,
    description,
    alternates: { canonical: url },
    // An empty category is a real page but has nothing to rank — keep it out of
    // the index until it has stock, while still letting Google follow its links.
    ...(category.products.length === 0 ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: 'website',
      url,
      title: `${category.name} — Bulk Corporate Gifts`,
      description,
      siteName: 'GIVOO',
      locale: 'en_IN',
      images: [{ url: ogImage, alt: `${category.name} corporate gifts` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${category.name} — Bulk Corporate Gifts`,
      description,
      images: [ogImage],
    },
  };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = await getCategoryBySlug(params.slug);
  if (!category) notFound();

  const copy = categoryCopy(category.slug, category.name);
  const intro = category.description?.trim() || copy.intro;
  const products = category.products;

  // Sibling categories, for internal linking out of this page.
  const siblings = (await getCategorySummaries()).filter((c) => c.slug !== category.slug);

  return (
    <div className="min-h-screen bg-canvas">
      <JsonLd
        data={collectionPageSchema({
          name: `${category.name} — Bulk Corporate Gifts`,
          description: intro,
          path: `/categories/${category.slug}`,
          items: products.map((p) => ({ name: p.name, path: `/products/${p.slug}` })),
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Categories', path: '/categories' },
          { name: category.name, path: `/categories/${category.slug}` },
        ])}
      />

      <div className="container-gc-w py-10 md:py-14">
        <nav aria-label="Breadcrumb" className="text-xs text-ink-3">
          <Link href="/" className="text-em hover:underline">
            Home
          </Link>{' '}
          /{' '}
          <Link href="/categories" className="text-em hover:underline">
            Categories
          </Link>{' '}
          / <span className="text-ink">{category.name}</span>
        </nav>

        <header className="mt-4 max-w-3xl">
          <h1 className="font-serif text-4xl font-light tracking-tight text-ink md:text-5xl">
            {category.name}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-ink-2">{intro}</p>
          <p className="mt-3 text-sm text-ink-3">
            {products.length} product{products.length === 1 ? '' : 's'} available for bulk order
          </p>
        </header>

        {products.length === 0 ? (
          <div className="mt-10 rounded-md border-2 border-dashed border-bdr bg-white py-16 text-center">
            <p className="text-lg text-ink">Nothing in this category right now</p>
            <p className="mt-1 text-sm text-ink-2">
              We&apos;re restocking. In the meantime, browse the full catalog.
            </p>
            <Link
              href="/catalog"
              className="mt-4 inline-block rounded-full bg-em px-6 py-2.5 text-sm font-semibold text-inv"
            >
              Browse all products
            </Link>
          </div>
        ) : (
          <section aria-label={`${category.name} products`} className="mt-10">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="group flex flex-col overflow-hidden rounded-md border-2 border-bdr bg-white transition hover:-translate-y-1 hover:shadow-card"
                >
                  <Link href={`/products/${product.slug}`} className="flex flex-1 flex-col">
                    <div className="relative aspect-square bg-gray-50">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          srcSet={cdnSrcSet(product.imageUrl)}
                          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                          alt={product.name}
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-4xl opacity-50">
                          📦
                        </div>
                      )}
                      {product.isEcoCertified && (
                        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-ink">
                          🍃 Eco
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-4">
                      {product.brand && <p className="text-[11px] text-ink-3">{product.brand}</p>}
                      <h2 className="mt-0.5 line-clamp-2 flex-1 text-sm font-semibold leading-snug text-ink transition group-hover:text-em">
                        {product.name}
                      </h2>
                      {product.price > 0 && (
                        <p className="mt-2 text-base font-black tabnum text-ink">
                          From {formatRupees(product.price)}
                          <span className="text-xs font-normal text-ink-3">/unit</span>
                        </p>
                      )}
                      {product.moq ? (
                        <p className="mt-1 text-[11px] text-ink-3">Min {product.moq} units</p>
                      ) : null}
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}

        {siblings.length > 0 && (
          <section aria-label="Other categories" className="mt-16 border-t border-bdr pt-8">
            <h2 className="text-xl font-black tracking-tight text-ink">Other categories</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {siblings.map((sibling) => (
                <Link
                  key={sibling.id}
                  href={`/categories/${sibling.slug}`}
                  className="rounded-full border-2 border-bdr bg-white px-4 py-1.5 text-sm font-medium text-ink-2 transition hover:border-em hover:text-em"
                >
                  {sibling.name}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
