'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  _count?: {
    products: number;
  };
}

interface CategoriesBentoProps {
  categories: Category[];
}

// Vibrant Bento colors from CLAUDE.md
const BENTO_COLORS = [
  { bg: 'bg-amber-50', border: 'border-amber-200', accent: 'text-amber-700' },
  { bg: 'bg-indigo-50', border: 'border-indigo-200', accent: 'text-indigo-700' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', accent: 'text-emerald-700' },
  { bg: 'bg-rose-50', border: 'border-rose-200', accent: 'text-rose-700' },
  { bg: 'bg-violet-50', border: 'border-violet-200', accent: 'text-violet-700' },
  { bg: 'bg-sky-50', border: 'border-sky-200', accent: 'text-sky-700' },
];

export function CategoriesBento({ categories }: CategoriesBentoProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {categories.map((cat, idx) => {
        const colorScheme = BENTO_COLORS[idx % BENTO_COLORS.length] ?? BENTO_COLORS[0]!;
        const productCount = cat._count?.products || 0;
        const catImageUrl =
          cat.imageUrl ||
          'https://images.unsplash.com/photo-1514432324607-2e467f4af445?w=500&h=500&fit=crop';

        return (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            whileHover={{ y: -12, boxShadow: '0 25px 50px rgba(0,0,0,0.12)' }}
          >
            <Link href={`/category/${cat.slug}`}>
              <div
                className={`group h-96 rounded-3xl p-8 cursor-pointer flex flex-col justify-between
                ${colorScheme.bg} border-2 ${colorScheme.border}
                hover:shadow-2xl transition-all duration-300 overflow-hidden relative`}
              >
                {/* Top Section - Category Info */}
                <div className="relative z-20">
                  <p className="text-xs font-normal text-gray-600 uppercase tracking-widest mb-3">
                    Explore
                  </p>
                  <h3 className="text-4xl sm:text-5xl font-normal text-slate-900 leading-tight">
                    {cat.name}
                  </h3>
                </div>

                {/* Product Image - Positioned bottom right with overlay */}
                <div className="absolute -bottom-8 -right-8 w-56 h-56 opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300">
                  <Image
                    src={catImageUrl}
                    alt={cat.name}
                    fill
                    className="object-cover object-center"
                    unoptimized
                  />
                </div>

                {/* Bottom Section - Product Count */}
                <div className="relative z-20 mt-auto">
                  <div className="inline-flex items-center gap-3">
                    <div className="bg-white/95 backdrop-blur-sm px-5 py-3 rounded-full shadow-lg">
                      <p className={`font-normal text-lg ${colorScheme.accent}`}>
                        {productCount}+
                      </p>
                      <p className="text-xs font-normal text-gray-600">items</p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
