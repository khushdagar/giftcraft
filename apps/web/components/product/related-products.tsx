'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatRupees } from '@/lib/utils';
import { useBuilderStore } from '@/store/builder';

// Extra fields (hsnCode, gstRate, lead time…) ride along untyped and are
// forwarded to the builder store as-is.
type SerializedProduct = {
  id: string;
  name: string;
  slug: string;
  brand?: string | null;
  priceTiers?: Array<{ sellPrice: number }>;
  images?: Array<{ url: string }>;
};

export function RelatedProducts({
  products,
  // Related *packs* are serialized without hsnCode/gstRate/lead time, so adding
  // them straight to the builder would drop GST data. The page turns this off
  // for pack pages and only "View details" is offered there.
  canAddToPack = true,
}: {
  products: SerializedProduct[];
  canAddToPack?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const reduceMotion = useReducedMotion();
  const { addProduct, removeProduct, products: cartProducts } = useBuilderStore();

  // Mirrors the card behaviour on the home/catalog sliders: clicking again
  // removes the product from the pack.
  const toggleProduct = (product: SerializedProduct, sellPrice: number) => {
    if (cartProducts.some((p: { id: string }) => p.id === product.id)) {
      removeProduct(product.id);
      return;
    }
    addProduct({ ...(product as any), quantity: 1, sellPrice });
  };

  // Scroll roughly one viewport of cards in the given direction.
  const scrollByCards = useCallback(
    (dir: 1 | -1) => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduceMotion ? 'auto' : 'smooth' });
    },
    [reduceMotion]
  );

  // Auto-advance every few seconds; loop back to the start at the end. Pauses
  // while the user is hovering/touching, and disabled for reduced-motion users.
  useEffect(() => {
    if (reduceMotion || products.length <= 1) return;
    const el = scrollRef.current;
    if (!el) return;

    const id = setInterval(() => {
      if (pausedRef.current) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: el.clientWidth * 0.8, behavior: 'smooth' });
      }
    }, 3500);

    return () => clearInterval(id);
  }, [reduceMotion, products.length]);

  if (!products.length) return null;

  const pause = () => { pausedRef.current = true; };
  const resume = () => { pausedRef.current = false; };

  return (
    <div className="border-t border-bdr bg-white py-12">
      <div className="container-gc-w">
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="overline text-ink-3">YOU MAY ALSO LIKE</p>
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
          onMouseEnter={pause}
          onMouseLeave={resume}
          onTouchStart={pause}
          onTouchEnd={resume}
          className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth"
        >
          {products.map((product) => {
            const price = product.priceTiers?.[0]?.sellPrice || 0;
            const inCart = cartProducts.some((p: { id: string }) => p.id === product.id);
            return (
              <div
                key={product.id}
                className="group w-44 flex-shrink-0 snap-start sm:w-64"
              >
                {/* h-full + flex keeps the buttons bottom-aligned across cards
                    whose titles wrap to different heights. */}
                <div className="flex h-full flex-col rounded-md overflow-hidden shadow-card hover:shadow-hover transition-shadow">
                  <Link href={`/products/${product.slug}`} className="block">
                    {/* Image */}
                    <div className="relative m-2.5 overflow-hidden rounded-md bg-elevated aspect-[4/3]">
                      {product.images?.[0]?.url ? (
                        <Image
                          src={product.images[0].url}
                          alt={product.name}
                          fill
                          // contain (not cover) so tall bottles/mugs are shown
                          // whole instead of being cropped top and bottom.
                          className="object-contain p-3 group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-5xl opacity-60">📦</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="px-3">
                      {product.brand && <p className="text-[11px] text-ink-3">{product.brand}</p>}
                      <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-tight">
                        {product.name}
                      </h3>
                      <p className="mt-2 font-black tabnum text-base">From {formatRupees(price)}</p>
                    </div>
                  </Link>

                  {/* Actions */}
                  <div className="mt-auto flex flex-col gap-2 px-3 pb-3 pt-3">
                    {canAddToPack && (
                      <button
                        type="button"
                        onClick={() => toggleProduct(product, price)}
                        className={`w-full rounded-full py-2 text-sm font-semibold transition ${
                          inCart
                            ? 'bg-em-700 text-white hover:bg-em-800'
                            : 'bg-em text-white hover:bg-em-600'
                        }`}
                      >
                        {inCart ? '✓ In Pack' : 'Add to Pack'}
                      </button>
                    )}
                    <Link
                      href={`/products/${product.slug}`}
                      className="w-full rounded-full border-2 border-bdr py-2 text-center text-sm font-semibold text-ink-2 transition hover:border-em hover:text-em"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
