'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { formatRupees } from '@/lib/utils';

interface SerializedProduct {
  id: string;
  name: string;
  slug: string;
  brand?: string | null;
  priceTiers?: Array<{ sellPrice: number }>;
  images?: Array<{ url: string }>;
}

export function RelatedProducts({ products }: { products: SerializedProduct[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (!products.length) return null;

  return (
    <div className="border-t border-bdr bg-white py-12">
      <div className="container-gc-w">
        <p className="overline mb-6 text-ink-3">YOU MAY ALSO LIKE</p>

        <motion.div
          ref={containerRef}
          className="flex gap-4 overflow-x-auto no-scrollbar"
          drag="x"
          dragElastic={0.2}
          dragConstraints={containerRef}
        >
          {products.map((product) => {
            const price = product.priceTiers?.[0]?.sellPrice || 0;
            return (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="flex-shrink-0 w-64 block group"
              >
                <div className="rounded-md overflow-hidden shadow-card hover:shadow-hover transition-shadow">
                  {/* Image */}
                  <div className="relative m-2.5 overflow-hidden rounded-md bg-elevated aspect-[4/3]">
                    {product.images?.[0]?.url ? (
                      <Image
                        src={product.images[0].url}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-5xl opacity-60">📦</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="px-3 pb-3">
                    {product.brand && <p className="text-[11px] text-ink-3">{product.brand}</p>}
                    <h3 className="mt-1 line-clamp-2 min-h-[32px] text-sm font-semibold leading-tight">
                      {product.name}
                    </h3>
                    <p className="mt-2 font-black tabnum text-base">From {formatRupees(price)}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
