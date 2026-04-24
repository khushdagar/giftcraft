'use client';

import { useRef } from 'react';
import { motion, useMotionValue, useTransform, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { formatRupees } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  priceTiers: Array<{
    sellPrice: number;
  }>;
}

export function FeaturedProductsSlider({ products }: { products: Product[] }) {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragX = useMotionValue(0);

  const getLowestPrice = (product: Product) => {
    if (!product.priceTiers || product.priceTiers.length === 0) {
      return 0;
    }
    return Math.min(...product.priceTiers.map((t) => t.sellPrice));
  };

  if (!products || products.length === 0) {
    return (
      <div className="rounded-md border-2 border-bdr bg-elevated p-8 text-center">
        <p className="text-ink-3">No featured products available</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <motion.div
        drag="x"
        dragConstraints={containerRef}
        dragElastic={0.2}
        onDragStart={() => {
          if (containerRef.current) {
            (containerRef.current.style.cursor = 'grabbing');
          }
        }}
        onDragEnd={() => {
          if (containerRef.current) {
            (containerRef.current.style.cursor = 'grab');
          }
        }}
        className="flex gap-4 cursor-grab"
        style={{ x: !reduce ? dragX : 0 }}
      >
        {products.map((product) => {
          const lowestPrice = getLowestPrice(product);

          return (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="flex-shrink-0"
            >
              <motion.div
                className="w-56 rounded-md border-2 border-bdr bg-white overflow-hidden hover:shadow-hover transition group"
                whileHover={reduce ? {} : { y: -8 }}
              >
                {/* Image placeholder */}
                <div className="w-full h-40 bg-elevated rounded-md overflow-hidden group-hover:scale-105 transition duration-300" />

                {/* Content */}
                <div className="p-4">
                  <p className="font-semibold text-ink text-sm line-clamp-2">
                    {product.name}
                  </p>
                  <p className="text-lg font-black text-em tabnum mt-2">
                    From {formatRupees(lowestPrice)}
                  </p>
                  <button className="mt-3 w-full bg-em text-white text-xs font-semibold py-2 rounded-md hover:bg-em-600 transition">
                    Add to Pack
                  </button>
                </div>
              </motion.div>
            </Link>
          );
        })}
      </motion.div>
    </div>
  );
}
