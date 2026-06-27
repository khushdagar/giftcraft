'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

interface Occasion {
  icon: string;
  name: string;
  desc: string;
  bg: string;
  slug: string;
}

interface OccasionsCarouselProps {
  occasions: Occasion[];
}

export function OccasionsCarousel({ occasions }: OccasionsCarouselProps) {
  const occasions_to_show = occasions.slice(0, 9); // Show up to 9 occasions in grid

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-10">
        {/* Header */}
        <div className="mb-16 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-normal text-slate-900 mb-4"
          >
            Shop by <span className="italic text-em">occasion.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-600 text-lg"
          >
            Find the perfect gift for every moment that matters.
          </motion.p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {occasions_to_show.map((occ, idx) => (
            <motion.div
              key={occ.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -8 }}
            >
              <Link href={`/catalog?occasion=${occ.slug}`}>
                <div
                  className={`h-56 rounded-3xl p-8 cursor-pointer flex flex-col justify-between
                  bg-gradient-to-br ${occ.bg}
                  hover:shadow-xl transition-all duration-300`}
                >
                  <div>
                    <p className="text-5xl mb-3">{occ.icon}</p>
                    <h3 className="text-2xl font-normal text-white mb-2">{occ.name}</h3>
                    <p className="text-white/90 text-sm leading-relaxed">{occ.desc}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
