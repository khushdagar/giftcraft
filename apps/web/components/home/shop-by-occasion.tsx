'use client';

import { useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cdnSrcSet, clearSrcSetOnError } from '@/lib/cdn-srcset';

export function ShopByOccasion() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const occasionColors: { [key: string]: string } = {
    'Diwali': 'linear-gradient(135deg, #C4963C 0%, #8B6F47 100%)',
    'Holi': 'linear-gradient(135deg, #E94B9D 0%, #F5C842 50%, #2FA877 100%)',
    'Christmas & New Year': 'linear-gradient(135deg, #6B1B1B 0%, #2B5A3B 100%)',
    'Women\'s Day': 'linear-gradient(135deg, #D946A6 0%, #A855A8 100%)',
    'Employee Onboarding': 'linear-gradient(135deg, #0F766E 0%, #1E40AF 100%)',
    'Client Appreciation': 'linear-gradient(135deg, #3F3F46 0%, #1F2937 100%)',
    'Birthday': 'linear-gradient(135deg, #7C3AED 0%, #DC2626 50%, #EA580C 100%)',
    'Work Anniversary': 'linear-gradient(135deg, #B8860B 0%, #654321 100%)',
    'Farewell': 'linear-gradient(135deg, #0F766E 0%, #059669 100%)',
  };

  const { data: occasions, isLoading } = useQuery({
    queryKey: ['occasions'],
    queryFn: async () => {
      const res = await fetch('/api/occasions');
      if (!res.ok) throw new Error('Failed to fetch occasions');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Group into pages of 4 — each page renders as a 2x2 grid, so a swipe
  // or arrow click always moves a full "screen" of 4 cards at once.
  const pages = useMemo(() => {
    const list = occasions ?? [];
    const chunked: any[][] = [];
    for (let i = 0; i < list.length; i += 4) {
      chunked.push(list.slice(i, i + 4));
    }
    return chunked;
  }, [occasions]);

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

  const renderCard = (occ: any) => (
    <Link
      key={occ.slug}
      href={`/catalog?occasion=${occ.slug}`}
      className="block w-full h-full aspect-[3/2] rounded-3xl overflow-hidden group cursor-pointer relative shadow-md hover:shadow-lg transition-shadow"
    >
      {occ.image ? (
        // Uploaded occasion photo (admin) — shown in place of the flat gradient.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={occ.image}
          srcSet={cdnSrcSet(occ.image)}
          sizes="(min-width: 768px) 25vw, 50vw"
          decoding="async"
          onError={clearSrcSetOnError}
          alt={occ.name}
          className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-600"
        />
      ) : (
        <div
          className="absolute inset-0 group-hover:scale-105 transition-transform duration-600"
          style={{ background: occasionColors[occ.name] || occ.bg }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white z-10">
        <h3 className="text-lg md:text-xl font-bold font-serif mb-1">{occ.name}</h3>
        <p className="text-xs md:text-sm text-white/80">{occ.description}</p>
      </div>
    </Link>
  );

  return (
    <section className="py-16 md:py-24 bg-[#FAFAF7]">
      <div className="container">
        <h2 className="text-4xl md:text-5xl text-center mb-2 font-serif font-normal">
          Shop by <span className="italic text-[#1A6B4F]">occasion.</span>
        </h2>
        <p className="text-center text-[#6B6B63] text-sm mb-12">
          Find the perfect gift for every moment that matters.
        </p>

        {/* Desktop / tablet: static grid */}
        <div className="hidden md:grid md:grid-cols-4 gap-3 sm:gap-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl aspect-[3/2] bg-[#E8E8E3] animate-pulse" />
              ))
            : occasions?.map((occ: any) => renderCard(occ))}
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
                    <div key={i} className="rounded-2xl h-40 bg-[#E8E8E3] animate-pulse" />
                  ))}
                </div>
              ) : (
                pages.map((quad, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-full snap-start grid grid-cols-2 grid-rows-2 gap-3 pb-2"
                  >
                    {quad.map((occ: any) => (
                      <div key={occ.slug} className="h-40">
                        {renderCard(occ)}
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
                aria-label="Previous occasions"
                className="absolute left-1 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-white/90 shadow-md flex items-center justify-center active:scale-95 transition"
              >
                <ChevronLeft className="h-5 w-5 text-[#1A6B4F]" />
              </button>
              <button
                type="button"
                onClick={() => scrollByPage('next')}
                aria-label="Next occasions"
                className="absolute right-1 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-white/90 shadow-md flex items-center justify-center active:scale-95 transition"
              >
                <ChevronRight className="h-5 w-5 text-[#1A6B4F]" />
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}