'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, ArrowRight } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  _count?: {
    products: number;
  };
}

interface CategoriesSliderProps {
  categories: Category[];
}

export function CategoriesSlider({ categories }: CategoriesSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  const VISIBLE_COUNT = 3; // Show 3 categories at a time
  const AUTOPLAY_INTERVAL = 6000; // Auto-slide every 6 seconds
  const categories_to_show = categories;

  // Auto-slide
  useEffect(() => {
    if (!autoplay || categories_to_show.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.max(1, categories_to_show.length - VISIBLE_COUNT + 1));
    }, AUTOPLAY_INTERVAL);

    return () => clearInterval(timer);
  }, [autoplay, currentIndex, categories_to_show.length]);

  // Calculate visible categories
  const visibleCategories = categories_to_show.slice(currentIndex, currentIndex + VISIBLE_COUNT);
  const totalPages = Math.max(1, Math.ceil(categories_to_show.length / VISIBLE_COUNT));
  const currentPage = Math.floor(currentIndex / VISIBLE_COUNT) + 1;

  return (
    <div>
      {/* Slider Container */}
      <div className="overflow-hidden rounded-2xl">
        <motion.div
          className="flex gap-6"
          animate={{
            x: -currentIndex * (100 / VISIBLE_COUNT) + '%',
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            duration: 0.8,
          }}
        >
          {categories_to_show.map((cat) => {
            const productCount = cat._count?.products || 0;
            const catImageUrl =
              cat.imageUrl ||
              'https://images.unsplash.com/photo-1514432324607-2e467f4af445?w=500&h=500&fit=crop';

            return (
              <motion.div
                key={cat.id}
                className="flex-shrink-0"
                style={{ width: `${100 / VISIBLE_COUNT}%` }}
                whileHover={{ y: -6 }}
              >
                <Link href={`/catalog?category=${cat.id}`}>
                  <div className="group bg-white rounded-2xl border-2 border-slate-100 overflow-hidden cursor-pointer hover:border-em hover:shadow-lg transition-all h-full mx-2">
                    {/* Image Container */}
                    <div className="relative h-56 bg-slate-100 overflow-hidden">
                      <Image
                        src={catImageUrl}
                        alt={cat.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                        unoptimized
                      />
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h3 className="text-xl font-normal text-slate-900 mb-2 group-hover:text-em transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-sm text-slate-600 flex items-center gap-2 mb-4">
                        <ShoppingCart className="w-4 h-4" />
                        {productCount}+ items
                      </p>
                      <button className="w-full bg-em hover:bg-em-600 text-white font-normal py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm">
                        Explore
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Dot Indicators */}
      <div className="flex justify-center gap-2 mt-8">
        {Array.from({ length: totalPages }).map((_, idx) => (
          <motion.button
            key={idx}
            onClick={() => {
              setCurrentIndex(idx * VISIBLE_COUNT);
              setAutoplay(false);
              setTimeout(() => setAutoplay(true), AUTOPLAY_INTERVAL);
            }}
            className={`rounded-full transition-all ${
              currentPage === idx + 1
                ? 'bg-em w-10 h-3'
                : 'bg-slate-300 w-3 h-3 hover:bg-slate-400'
            }`}
            whileHover={{ scale: 1.2 }}
          />
        ))}
      </div>

      {/* Slide Counter */}
      <div className="text-center mt-6">
        <p className="text-sm text-slate-500">
          <span className="font-normal text-em">{currentPage}</span> of{' '}
          <span className="font-normal">{totalPages}</span>
        </p>
      </div>
    </div>
  );
}
