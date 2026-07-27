'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

const TESTIMONIALS = [
  {
    text: 'GIVOO transformed our employee gifting process. 200 customized hampers delivered perfectly.',
    author: 'Priya Sharma',
    role: 'HR Lead, TechCorp',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
  },
  {
    text: 'The mockup approval system saved us from costly mistakes. Transparent pricing is a game-changer.',
    author: 'Rohan Mehta',
    role: 'Operations Manager, FlipStart',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
  },
  {
    text: 'Finally, corporate gifting feels like a real product, not just a sales call. Highly recommended.',
    author: 'Anjali Kapoor',
    role: 'Marketing Head, Nykaa',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-16 bg-gradient-to-b from-slate-50 to-white">
      <div className="container-gc max-w-5xl">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-4xl font-normal text-slate-900 mb-12 text-center"
        >
          Loved by Corporate Teams
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((testi, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-xl p-8 border-2 border-gray-100 hover:border-em hover:shadow-lg transition-all"
            >
              {/* Quote */}
              <p className="text-slate-700 italic mb-6 leading-relaxed">"{testi.text}"</p>

              {/* Author */}
              <div className="flex items-center gap-4 pt-6 border-t border-gray-100">
                <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={testi.image}
                    alt={testi.author}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div>
                  <p className="font-normal text-slate-900">{testi.author}</p>
                  <p className="text-xs text-slate-600">{testi.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
