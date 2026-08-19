'use client';

import { useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cdnSrcSet, clearSrcSetOnError } from '@/lib/cdn-srcset';

// Fallback tile backgrounds, cycled by position — used only when a category
// has no cover image set in admin. Same maroon/charcoal family as the occasion
// tiles so the two sections read as one system.
const CATEGORY_GRADIENTS = [
  'linear-gradient(135deg, #800020 0%, #3D000F 100%)',
  'linear-gradient(135deg, #222222 0%, #800020 100%)',
  'linear-gradient(135deg, #B04057 0%, #6B001B 100%)',
  'linear-gradient(135deg, #560015 0%, #000000 100%)',
  'linear-gradient(135deg, #3A3A3A 0%, #000000 100%)',
  'linear-gradient(135deg, #800020 0%, #B04057 50%, #D9A0AB 100%)',
  'linear-gradient(135deg, #6B001B 0%, #222222 100%)',
  'linear-gradient(135deg, #222222 0%, #5C5852 100%)',
];

export function ShopByCategory({ initialData }: { initialData?: any[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['home-categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      const json = await res.json();
      return (json?.data ?? []).map((c: any) => ({
        name: c.name,
        slug: c.slug,
        image: c.imageUrl || null,
        // `description` comes back as the admin's rich text — strip the markup
        // so the card subtitle never renders raw tags. Mirrors getHomeCategories.
        description: String(c.description || '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 80),
      }));
    },
    // Server-rendered on the homepage so category links are crawlable.
    initialData,
    staleTime: 5 * 60 * 1000,
  });

  // Desktop teaser shows the first 6 (with a See All link below) — two full
  // rows of the 3-up grid, no ragged trailing row. The full list lives at
  // /categories, and the mobile slider pages through everything.
  const featured = useMemo(() => (categories ?? []).slice(0, 6), [categories]);

  // Group into pages of 4 — each page renders as a 2x2 grid, so a swipe
  // or arrow click always moves a full "screen" of 4 cards at once.
  const pages = useMemo(() => {
    const list = categories ?? [];
    const chunked: any[][] = [];
    for (let i = 0; i < list.length; i += 4) {
      chunked.push(list.slice(i, i + 4));
    }
    return chunked;
  }, [categories]);

  const scrollByPage = (dir: 'prev' | 'next') => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    if (dir === 'next') {
      // Loop to start if already on the last page.
      if (scrollLeft + clientWidth >= scrollWidth - 8) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: clientWidth, behavior: 'smooth' });
      }
    } else {
      if (scrollLeft <= 8) {
        el.scrollTo({ left: scrollWidth, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: -clientWidth, behavior: 'smooth' });
      }
    }
  };

  const renderCard = (cat: any, index: number) => (
    <Link
      key={cat.slug}
      href={`/category/${cat.slug}`}
      className="block w-full h-full aspect-[3/2] rounded-3xl overflow-hidden group cursor-pointer relative shadow-md hover:shadow-lg transition-shadow"
    >
      {cat.image ? (
        // Uploaded category cover (admin) — shown in place of the flat gradient.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cat.image}
          srcSet={cdnSrcSet(cat.image)}
          sizes="(min-width: 768px) 33vw, 50vw"
          decoding="async"
          onError={clearSrcSetOnError}
          alt={cat.name}
          className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-600"
        />
      ) : (
        <div
          className="absolute inset-0 group-hover:scale-105 transition-transform duration-600"
          style={{ background: CATEGORY_GRADIENTS[index % CATEGORY_GRADIENTS.length] }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white z-10">
        <h3 className="text-lg md:text-xl font-bold font-serif mb-1">{cat.name}</h3>
      </div>
    </Link>
  );

  return (
    <section className="py-16 md:pt-24 pb-10 bg-white">
      <div className="container">
        <h2 className="text-4xl md:text-5xl text-center mb-2 font-serif font-normal">
          Shop by <span className="italic text-[#800020]">Categories</span>
        </h2>
        <p className="text-center text-[#5C5852] text-sm mb-12">
          Browse our range and find exactly what you have in mind.
        </p>

        {/* Desktop / tablet: static grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-3 sm:gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl aspect-[3/2] bg-[#E5DFD4] animate-pulse" />
              ))
            : featured.map((cat: any, i: number) => renderCard(cat, i))}
        </div>

        {/* Mobile: 2x2 pages, swipeable + arrow navigation */}
        <div className="md:hidden relative -mx-4 px-4">
          <div
            ref={scrollRef}
            className="overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory"
          >
            <div className="flex">
              {isLoading ? (
                <div className="flex-shrink-0 w-full snap-start grid grid-cols-2 grid-rows-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-2xl h-40 bg-[#E5DFD4] animate-pulse" />
                  ))}
                </div>
              ) : (
                pages.map((quad, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-full snap-start grid grid-cols-2 grid-rows-2 gap-3 pb-2"
                  >
                    {quad.map((cat: any, j: number) => (
                      <div key={cat.slug} className="h-40">
                        {renderCard(cat, i * 4 + j)}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Arrow navigation */}
          {!isLoading && pages.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => scrollByPage('prev')}
                aria-label="Previous categories"
                className="absolute left-1 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-white/90 shadow-md flex items-center justify-center active:scale-95 transition"
              >
                <ChevronLeft className="h-5 w-5 text-[#800020]" />
              </button>
              <button
                type="button"
                onClick={() => scrollByPage('next')}
                aria-label="Next categories"
                className="absolute right-1 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-white/90 shadow-md flex items-center justify-center active:scale-95 transition"
              >
                <ChevronRight className="h-5 w-5 text-[#800020]" />
              </button>
            </>
          )}
        </div>

        {/* Hub link — desktop only: the grid above is capped at 6 categories,
            while the mobile slider already pages through all of them. */}
        {!isLoading && featured.length > 0 && (
          <div className="mt-8 md:mt-10 hidden md:flex justify-center">
            <Link
              href="/categories"
              className="flex items-center justify-center rounded-full border border-[#800020] px-8 py-2.5 text-sm font-semibold text-[#800020] transition hover:bg-[#800020] hover:text-white"
            >
              See All →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
