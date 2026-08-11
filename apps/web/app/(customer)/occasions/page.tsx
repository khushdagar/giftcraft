import type { Metadata } from 'next';
import Link from 'next/link';
import { getOccasionSummaries } from '@/lib/occasion-data';
import { occasionCopy } from '@/lib/occasion-content';
import { stripHtml } from '@/lib/strip-html';
import { formatRupees } from '@/lib/utils';
import { JsonLd } from '@/components/seo/json-ld';
import { breadcrumbSchema, collectionPageSchema } from '@/lib/schema';

// Fully server-rendered: this page is the crawlable hub linking the site root to
// every occasion, and from there to every product. Mirrors /categories.
export const revalidate = 3600;

// Shown when an occasion has no cover image uploaded in the admin.
const PLACEHOLDER_IMAGE = '/placeholder-tile.svg';

export const metadata: Metadata = {
  // Root template appends "· GIVOO"
  title: 'Shop Corporate Gifts by Occasion',
  description:
    'Browse bulk corporate gifting by occasion — Diwali, onboarding, work anniversaries, client appreciation and more. Branding included in every per-unit price.',
  alternates: { canonical: '/occasions' },
  openGraph: {
    type: 'website',
    url: '/occasions',
    title: 'Shop Corporate Gifts by Occasion',
    description:
      'Browse bulk corporate gifting by occasion — Diwali, onboarding, work anniversaries, client appreciation and more.',
    siteName: 'GIVOO',
    locale: 'en_IN',
  },
};

export default async function OccasionsPage() {
  const occasions = await getOccasionSummaries(false);

  return (
    <div className="min-h-screen bg-canvas">
      <JsonLd
        data={collectionPageSchema({
          name: 'Corporate Gifting Occasions',
          description:
            'Bulk corporate gifting occasions on GIVOO, from Diwali and onboarding to work anniversaries and client appreciation.',
          path: '/occasions',
          items: occasions.map((o) => ({ name: o.name, path: `/occasion/${o.slug}` })),
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Occasions', path: '/occasions' },
        ])}
      />

      <div className="container-gc-w py-12 md:py-16">
        <nav aria-label="Breadcrumb" className="text-xs text-ink-3">
          <Link href="/" className="text-em hover:underline">
            Home
          </Link>{' '}
          / <span>Occasions</span>
        </nav>

        <header className="mt-4 max-w-3xl">
          <h1 className="mt-1 font-serif text-4xl font-light tracking-tight text-ink md:text-5xl">
            Shop corporate gifts by occasion
          </h1>
          <p className="mt-4 text-base leading-relaxed text-ink-2">
            Gifting for a festival, a new joiner or a client milestone? Every occasion below is
            priced per unit with standard branding already included — no separate printing charge,
            and the rate steps down as your quantity grows. Or{' '}
            <Link href="/box" className="font-semibold text-em underline">
              build a gift pack
            </Link>{' '}
            from across the range.
          </p>
        </header>

        {occasions.length === 0 ? (
          <div className="mt-12 rounded-md border-2 border-dashed border-bdr bg-white py-20 text-center">
            <p className="text-lg text-ink">Occasions are being updated</p>
            <Link href="/catalog" className="mt-2 inline-block text-sm font-medium text-em">
              Browse all products →
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {occasions.map((occasion) => {
              // The admin description is rich text — a clamped card blurb wants
              // plain text, not markup, so strip the tags here.
              const blurb =
                stripHtml(occasion.description) ||
                occasionCopy(occasion.name, occasion.isCollection).intro;
              return (
                <Link
                  key={occasion.id}
                  href={`/occasion/${occasion.slug}`}
                  className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-md transition hover:-translate-y-1 hover:shadow-lg"
                >
                  {/* One cover photo — the same image-card treatment as the
                      homepage "Shop by occasion" tiles. Occasions with no cover
                      uploaded fall back to the brand tile. */}
                  <div className="relative aspect-[3/2] overflow-hidden bg-elevated">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={occasion.imageUrl || PLACEHOLDER_IMAGE}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                      <h2 className="font-serif text-2xl font-normal">
                        {/* {occasion.icon && <span className="mr-2">{occasion.icon}</span>} */}
                        {occasion.name}
                      </h2>
                      <p className="mt-1 text-xs text-white/85">
                        {occasion.productCount} product{occasion.productCount === 1 ? '' : 's'}
                        {occasion.fromPrice !== null && (
                          <span> · From {formatRupees(occasion.fromPrice)}/pack</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* <div className="flex flex-1 flex-col p-5">
                    <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-ink-2">{blurb}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-em">
                      Explore {occasion.name} <span aria-hidden>→</span>
                    </span>
                  </div> */}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
