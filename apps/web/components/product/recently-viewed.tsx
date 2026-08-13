'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatRupees } from '@/lib/utils';
import { useRecentlyViewedStore } from '@/store/recently-viewed';

/**
 * Invisible helper dropped onto a product page to record the visit into the
 * recently-viewed store (localStorage). Kept separate from the slider so the
 * server-rendered PDP only ships a tiny client island for tracking.
 */
export function RecentlyViewedTracker(props: {
  id: string;
  name: string;
  slug: string;
  image?: string;
  fromPrice: number;
}) {
  const record = useRecentlyViewedStore((s) => s.record);
  useEffect(() => {
    record(props);
    // Record once per mount — the props never change for a given product page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.id]);
  return null;
}

/**
 * "Recently Viewed" strip — same snap-scroll carousel pattern as
 * RelatedProducts ("You May Also Like"), minus the autoplay: this rail sits at
 * the bottom of browsing pages where self-scrolling content is distracting.
 */
export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const items = useRecentlyViewedStore((s) => s.items);

  // localStorage only exists on the client — render nothing until mounted so
  // server and client HTML agree.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const scrollByCards = useCallback(
    (dir: 1 | -1) => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduceMotion ? 'auto' : 'smooth' });
    },
    [reduceMotion]
  );

  const list = mounted ? items.filter((i) => i.id !== excludeId) : [];
  if (list.length === 0) return null;

  return (
    <div className="border-t border-bdr bg-white py-12">
      <div className="container-gc-w">
        <div className="mb-6 flex items-center justify-between gap-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-normal text-slate-900 mb-4"
          >
            Recently<span className="italic text-em"> Viewed</span>
          </motion.h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => scrollByCards(-1)}
              aria-label="Previous products"
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-bdr text-ink-2 transition hover:border-em hover:text-em"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCards(1)}
              aria-label="Next products"
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-bdr text-ink-2 transition hover:border-em hover:text-em"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth"
        >
          {list.map((item) => (
            <div key={item.id} className="group w-44 flex-shrink-0 snap-start sm:w-64">
              <div className="flex h-full flex-col rounded-md overflow-hidden shadow-card hover:shadow-hover transition-shadow">
                <Link href={`/products/${item.slug}`} className="block flex-1">
                  <div className="relative m-2.5 overflow-hidden rounded-md bg-elevated aspect-[3/4]">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(min-width: 640px) 256px, 176px"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-5xl opacity-60">📦</div>
                    )}
                  </div>
                  <div className="px-3 pb-3">
                    <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-tight">
                      {item.name}
                    </h3>
                    {item.fromPrice > 0 && (
                      <p className="mt-2 font-black tabnum text-base">
                        From {formatRupees(item.fromPrice)}
                      </p>
                    )}
                  </div>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
