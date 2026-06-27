'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const HERO_SLIDES = [
  {
    title: 'Corporate Gifting Redefined',
    subtitle: 'Curated products. Custom branding. Instant pricing.',
    image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200&h=600&fit=crop',
    cta: 'Start Building',
  },
  {
    title: 'Premium Gift Collections',
    subtitle: 'Handpicked items for every occasion and budget',
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1200&h=600&fit=crop',
    cta: 'Explore Now',
  },
  {
    title: 'Fast & Reliable Delivery',
    subtitle: '7-14 days turnaround. 50+ cities covered.',
    image: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=1200&h=600&fit=crop',
    cta: 'View Pricing',
  },
];

export function HeroSection() {
  const [heroSlide, setHeroSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setHeroSlide((s) => (s + 1) % 3), 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative h-[600px] overflow-hidden">
      {HERO_SLIDES.map((slide, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0 }}
          animate={{ opacity: heroSlide === idx ? 1 : 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            className="object-cover"
            priority={idx === 0}
          />
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="absolute inset-0 flex flex-col justify-center items-center text-center text-white px-4">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-5xl sm:text-6xl font-normal mb-4 leading-tight max-w-3xl"
            >
              {slide.title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl text-white/90 mb-8 max-w-2xl"
            >
              {slide.subtitle}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex gap-4 flex-wrap justify-center"
            >
              <Link href="/builder">
                <Button className="bg-white text-slate-900 hover:bg-gray-100 px-8 py-3 rounded-lg font-normal text-base">
                  {slide.cta}
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      ))}

      {/* Slide indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-10">
        {HERO_SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setHeroSlide(idx)}
            className={`transition-all duration-300 ${
              heroSlide === idx ? 'w-10 h-1 bg-white' : 'w-2 h-1 bg-white/50 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
