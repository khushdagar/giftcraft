'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useBuilderStore } from '@/store/builder';

export function TrendingProducts() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { addProduct, removeProduct, products: cartProducts } = useBuilderStore();

  const { data: featuredProducts, isLoading } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      const res = await fetch('/api/products?sort=featured&limit=6');
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
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

    let paused = false;
    const pause = () => { paused = true; };
    const resume = () => { paused = false; };
    el.addEventListener('mouseenter', pause);
    el.addEventListener('mouseleave', resume);
    el.addEventListener('touchstart', pause, { passive: true });
    el.addEventListener('touchend', resume, { passive: true });

    const timer = setInterval(() => {
      if (paused) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      // Near the end → loop back to the start; otherwise advance one card width.
      if (scrollLeft + clientWidth >= scrollWidth - 8) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: 300, behavior: 'smooth' });
      }
    }, 3000);

    return () => {
      clearInterval(timer);
      el.removeEventListener('mouseenter', pause);
      el.removeEventListener('mouseleave', resume);
      el.removeEventListener('touchstart', pause);
      el.removeEventListener('touchend', resume);
    };
  }, [featuredProducts?.products, reduceMotion]);

  return (
    <section className="bg-white py-20 md:py-28">
      <div className="container">
        <div className="flex justify-between items-end mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-normal">
            Trending <span className="italic">now.</span>
          </h2>
          <Link href="/catalog" className="text-sm font-semibold text-[#1A6B4F] hover:opacity-70">
            See All →
          </Link>
        </div>

        <div ref={scrollRef} className="overflow-x-auto no-scrollbar scroll-smooth">
          <div className="flex gap-6 pb-4 min-w-min">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-72 bg-white border border-[#E8E8E3] rounded-2xl overflow-hidden">
                  <div className="aspect-square bg-[#E8E8E3] animate-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-[#E8E8E3] rounded w-20 animate-pulse" />
                    <div className="h-4 bg-[#E8E8E3] rounded animate-pulse" />
                    <div className="h-8 bg-[#E8E8E3] rounded animate-pulse" />
                  </div>
                </div>
              ))
            ) : (
              featuredProducts?.products?.map((p: any) => {
                const primaryImage = p.images?.[0];
                const price = p.priceTiers?.[0]?.sellPrice || 0;
                const inCart = cartProducts.some((pr: any) => pr.id === p.id);
                return (
                  <div key={p.id} className="flex-shrink-0 w-72 bg-white border border-[#E8E8E3] rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Image + details link to the product page */}
                    <Link href={`/products/${p.slug}`} className="block group">
                      <div className="aspect-square bg-[#F5F5F0] flex items-center justify-center relative overflow-hidden">
                        {primaryImage?.url ? (
                          <Image
                            src={primaryImage.url}
                            alt={p.name}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <span className="text-6xl">📦</span>
                        )}
                        {p.priceTiers?.[0]?.minQty && (
                          <span className="absolute top-4 left-4 text-xs font-bold bg-[#FBF5E9] text-[#886528] px-2 py-1 rounded-full">
                            Min {p.priceTiers[0].minQty}
                          </span>
                        )}
                        {p.isEcoCertified && (
                          <span className="absolute top-4 right-4 text-xs font-bold bg-[#E8F5EF] text-[#0F4934] px-2 py-1 rounded-full">
                            🍃 Eco
                          </span>
                        )}
                      </div>
                      <div className="px-5 pt-5">
                        <p className="text-xs text-[#9B9B93] mb-1">{p.brand || 'Brand'}</p>
                        <h3 className="text-sm font-medium mb-3 leading-snug line-clamp-2 group-hover:text-[#1A6B4F] transition-colors">
                          {p.name}
                        </h3>
                        <p className="text-lg font-bold">₹{Math.round(price).toLocaleString()}</p>
                      </div>
                    </Link>

                    <div className="px-5 pb-5 pt-4">
                      <button
                        onClick={() => toggleProduct({ ...p, sellPrice: price })}
                        className={`w-full py-2 rounded-full font-semibold text-sm transition ${
                          inCart ? 'bg-[#1A6B4F] text-white' : 'bg-[#1A6B4F] text-white hover:bg-[#145A42]'
                        }`}
                      >
                        {inCart ? '✓ In Cart' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
