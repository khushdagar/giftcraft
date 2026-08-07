'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useBuilderStore } from '@/store/builder';
import { resolveSwatchHex } from '@/lib/color-name';

export function TrendingProducts({ initialData }: { initialData?: { products: any[] } }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { addProduct, removeProduct, products: cartProducts } = useBuilderStore();
  // Per-card image override when a colour swatch is hovered/selected.
  const [variantImg, setVariantImg] = useState<Record<string, string | null>>({});
  // Which card is currently hovered (to show its second image).
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const { data: featuredProducts, isLoading } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      const res = await fetch('/api/products?sort=featured&limit=6');
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
    // Server-rendered on the homepage so the cards (and their product links)
    // are in the initial HTML for search engines.
    initialData,
    staleTime: 60 * 1000,
  });

  const toggleProduct = (product: any) => {
    const isAdded = cartProducts.some((p: any) => p.id === product.id);
    if (isAdded) {
      removeProduct(product.id);
    } else {
      // Use the sellPrice passed in, fallback to priceTiers
      const sellPrice = product.sellPrice || product.priceTiers?.[0]?.sellPrice || 0;
      addProduct({
        id: product.id,
        name: product.name,
        slug: product.slug,
        brand: product.brand,
        printingTechnique: product.printingTechnique,
        hsnCode: product.hsnCode,
        gstRate: product.gstRate,
        leadTimeDays: product.leadTimeDays,
        weightG: (product as any).weightG,
        dimensionL: (product as any).dimensionL ?? (product as any).lengthCm,
        dimensionW: (product as any).dimensionW ?? (product as any).widthCm,
        dimensionH: (product as any).dimensionH ?? (product as any).heightCm,
        quantity: 1,
        sellPrice,
        priceTiers: product.priceTiers,
        images: product.images,
      });
    }
  };

  // Auto-scroll the carousel horizontally; loops back to the start at the end,
  // pauses on hover, and is disabled when the user prefers reduced motion.
  useEffect(() => {
    const el = scrollRef.current;
    const count = featuredProducts?.products?.length ?? 0;
    if (!el || count === 0 || reduceMotion) return;

    let hovered = false;
    // Any manual interaction parks the auto-scroll for a while, so the carousel
    // never yanks the row out from under a finger that's still swiping.
    const IDLE_MS = 6000;
    let pausedUntil = 0;
    // Our own scrollBy/scrollTo also fire `scroll`; ignore those so a programmatic
    // step doesn't read as user input and pause the timer forever.
    let autoUntil = 0;

    const hold = () => { pausedUntil = Date.now() + IDLE_MS; };
    const onScroll = () => { if (Date.now() > autoUntil) hold(); };
    const onEnter = () => { hovered = true; };
    const onLeave = () => { hovered = false; };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('touchstart', hold, { passive: true });
    el.addEventListener('touchmove', hold, { passive: true });
    el.addEventListener('wheel', hold, { passive: true });
    el.addEventListener('pointerdown', hold);
    el.addEventListener('scroll', onScroll, { passive: true });

    const timer = setInterval(() => {
      if (hovered || Date.now() < pausedUntil) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      // Smooth scrolling keeps firing `scroll` events after the call returns —
      // stay in "auto" mode long enough to cover the whole animation.
      autoUntil = Date.now() + 1200;
      // Near the end → loop back to the start; otherwise advance one card width.
      if (scrollLeft + clientWidth >= scrollWidth - 8) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        // Step exactly one card + gap, measured from the DOM so the row always
        // lands on a card edge at whatever width the cards currently are.
        const card = el.firstElementChild?.firstElementChild as HTMLElement | undefined;
        const step = card ? card.offsetWidth + 12 : clientWidth * 0.4;
        el.scrollBy({ left: step, behavior: 'smooth' });
      }
    }, 3000);

    return () => {
      clearInterval(timer);
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('touchstart', hold);
      el.removeEventListener('touchmove', hold);
      el.removeEventListener('wheel', hold);
      el.removeEventListener('pointerdown', hold);
      el.removeEventListener('scroll', onScroll);
    };
  }, [featuredProducts?.products, reduceMotion]);

  return (
    <section className="bg-white py-12 md:py-28">
      <div className="container">
        <div className="flex justify-between items-end mb-8 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-normal">
            Trending <span className="italic text-[#800020]">Now.</span>
          </h2>
          {/* On mobile the link lives under the row instead — see below. */}
          <Link href="/catalog" className="hidden sm:block text-sm font-semibold text-[#800020] hover:opacity-70">
            See All →
          </Link>
        </div>

        <div ref={scrollRef} className="overflow-x-auto no-scrollbar scroll-smooth">
          <div className="flex gap-3 pb-4 min-w-min sm:gap-6">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[calc(50vw-22px)] sm:w-64 lg:w-72 bg-white border border-[#E5DFD4] rounded-2xl overflow-hidden">
                  <div className="aspect-square bg-[#E5DFD4] animate-pulse" />
                  <div className="p-3 sm:p-5 space-y-3">
                    <div className="h-4 bg-[#E5DFD4] rounded w-20 animate-pulse" />
                    <div className="h-4 bg-[#E5DFD4] rounded animate-pulse" />
                    <div className="h-8 bg-[#E5DFD4] rounded animate-pulse" />
                  </div>
                </div>
              ))
            ) : (
              featuredProducts?.products?.map((p: any) => {
                const primaryImage = p.images?.find((img: any) => img.isPrimary) || p.images?.[0];
                const baseUrl = primaryImage?.url;
                // A second, distinct image to reveal on hover (if the product has one).
                const secondUrl = p.images?.find((img: any) => img.url !== baseUrl)?.url;
                const price = p.priceTiers?.[0]?.sellPrice || 0;
                const inCart = cartProducts.some((pr: any) => pr.id === p.id);
                const colorVariants = (p.variants || []).filter((v: any) => v.kind === 'color');
                const override = variantImg[p.id]; // string | null | undefined
                const displayUrl =
                  override !== undefined
                    ? (override || baseUrl)
                    : (hoveredCard === p.id && secondUrl ? secondUrl : baseUrl);
                return (
                  <div
                    key={p.id}
                    onMouseEnter={() => setHoveredCard(p.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    // Exactly 2 cards per phone screen (container padding + gap
                    // accounted for); the rest arrive via the auto-scroll.
                    // Cards stretch to the tallest in the row (flex default) and
                    // lay out as a column so the CTA can sit at the bottom edge.
                    className="flex h-auto flex-col flex-shrink-0 w-[calc(50vw-22px)] sm:w-64 lg:w-72 bg-white border border-[#E5DFD4] rounded-2xl overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {/* Image + details link to the product page */}
                    <Link href={`/products/${p.slug}`} className="block group">
                      <div className="aspect-square bg-[#FAFAFA] flex items-center justify-center relative overflow-hidden">
                        {displayUrl ? (
                          <Image
                            src={displayUrl}
                            alt={p.name}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <span className="text-6xl">📦</span>
                        )}
                        {(p.moq ?? p.priceTiers?.[0]?.minQty) && (
                          <span className="absolute top-2 left-2 sm:top-4 sm:left-4 text-[10px] sm:text-xs font-bold bg-[#F5F1EB] text-[#222222] px-2 py-0.5 sm:py-1 rounded-full">
                            Min {p.moq ?? p.priceTiers[0].minQty}
                          </span>
                        )}
                        {p.isEcoCertified && (
                          <span className="absolute top-2 right-2 sm:top-4 sm:right-4 text-[10px] sm:text-xs font-bold bg-[#FBF4F5] text-[#560015] px-2 py-0.5 sm:py-1 rounded-full">
                            Eco
                          </span>
                        )}
                      </div>
                      <div className="px-3 pt-3 sm:px-5 sm:pt-5">
                        {/* <p className="text-[10px] sm:text-xs text-[#8F8A82] mb-1 truncate">{p.brand || 'Brand'}</p> */}
                        <h3 className="text-[12px] sm:text-sm font-medium mb-2 sm:mb-3 leading-snug line-clamp-2 group-hover:text-[#800020] transition-colors">
                          {p.name}
                        </h3>
                        <p className="text-sm sm:text-lg font-bold">₹{Math.round(price).toLocaleString()}</p>
                      </div>
                    </Link>

                    {/* mt-auto pins swatches + CTA to the bottom, so the buttons
                        line up across cards with different name lengths. */}
                    <div className="mt-auto">
                    {/* Colour swatches — hover/tap swaps the card image */}
                    {colorVariants.length > 0 && (
                      <div className="flex items-center gap-1.5 px-3 pt-2 sm:px-5 sm:pt-3">
                        {colorVariants.slice(0, 6).map((v: any) => (
                          <button
                            key={v.id || v.value}
                            type="button"
                            title={v.value}
                            onMouseEnter={() =>
                              v.imageUrl && setVariantImg((m) => ({ ...m, [p.id]: v.imageUrl }))
                            }
                            onClick={() =>
                              setVariantImg((m) => ({ ...m, [p.id]: v.imageUrl || null }))
                            }
                            className="h-4 w-4 sm:h-5 sm:w-5 rounded-full border border-[#E5DFD4] transition hover:scale-110"
                            style={{ backgroundColor: resolveSwatchHex(v.value, v.hexColor) }}
                          />
                        ))}
                      </div>
                    )}

                    <div className="px-3 pb-3 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
                      <button
                        onClick={() => toggleProduct({ ...p, sellPrice: price })}
                        className={`w-full py-1.5 sm:py-2 rounded-full font-semibold text-[12px] sm:text-sm transition ${
                          inCart ? 'bg-[#800020] text-white' : 'bg-[#800020] text-white hover:bg-[#6B001B]'
                        }`}
                      >
                        {inCart ? '✓ In Cart' : 'Add to Pack'}
                      </button>
                    </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Mobile placement of "See All" — below the row, where the thumb is. */}
        <Link
          href="/catalog"
          className="mt-4 flex sm:hidden w-full items-center justify-center rounded-full border border-[#800020] py-2.5 text-sm font-semibold text-[#800020]"
        >
          See All →
        </Link>
      </div>
    </section>
  );
}
