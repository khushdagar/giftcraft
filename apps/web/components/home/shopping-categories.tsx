'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

interface ShoppingCategoriesProps {
  categories: Category[];
}

export function ShoppingCategories({ categories }: ShoppingCategoriesProps) {
  // Fallback images for display
  const categoryImages: Record<string, string> = {
    apparel: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop',
    accessories: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop',
    drinkware: 'https://images.unsplash.com/photo-1514432324607-2e467f4af445?w=300&h=300&fit=crop',
    office: 'https://images.unsplash.com/photo-1484480494535-248f3fcb1173?w=300&h=300&fit=crop',
    tech: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop',
    home: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=300&fit=crop',
  };

  return (
    <section className="py-16 bg-white">
      <div className="container-gc">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-normal text-slate-900 mb-3">
            What are you shopping for <span className="text-em italic">today?</span>
          </h2>
          <p className="text-slate-600 text-lg">Browse by category and find the perfect gift</p>
        </motion.div>

        {/* Categories Grid */}
        <div className="flex flex-wrap justify-center gap-10 sm:gap-14 lg:gap-16">
          {categories.slice(0, 8).map((cat, idx) => {
            const imageUrl =
              cat.imageUrl || categoryImages[cat.slug] || categoryImages.apparel;

            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.08 }}
                whileHover={{ scale: 1.1 }}
              >
                <Link href={`/catalog?category=${cat.id}`}>
                  <div className="flex flex-col items-center cursor-pointer group">
                    {/* Circular Image Container */}
                    <motion.div
                      whileHover={{ boxShadow: '0 30px 60px rgba(128, 0, 32, 0.25)' }}
                      className="relative w-40 sm:w-52 h-40 sm:h-52 mb-6 rounded-full overflow-hidden
                      bg-gradient-to-br from-em/10 to-emerald-100 border-4 border-em/20
                      hover:border-em transition-all duration-300 shadow-xl group-hover:shadow-2xl"
                    >
                      {imageUrl && (
                        <Image
                          src={imageUrl}
                          alt={cat.name}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                          unoptimized
                        />
                      )}
                    </motion.div>

                    {/* Category Label */}
                    <p className="text-base sm:text-xl font-normal text-slate-900 text-center group-hover:text-em transition-colors leading-tight">
                      {cat.name}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* View All Link */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <Link href="/catalog">
            <p className="text-em font-normal text-lg hover:underline inline-block">
              View All Categories →
            </p>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
