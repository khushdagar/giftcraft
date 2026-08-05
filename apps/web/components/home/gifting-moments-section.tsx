'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Sparkles } from 'lucide-react';

const MOMENTS = [
  {
    icon: '🪔',
    tag: 'DIWALI COLLECTION',
    title: 'Light Up Your Relationships',
    description: 'Premium hampers and branded boxes perfect for corporate celebrations. Impress your clients and delight your team.',
    benefits: ['Free Customization', 'Fast Delivery', 'Bulk Discounts'],
    offer: 'Up to 20% OFF',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1000&h=1000&fit=crop',
    cta: 'Browse Collection',
    ctaLink: '/catalog',
    gradient: 'from-amber-400 via-orange-400 to-orange-500',
    accentColor: 'text-amber-600',
    badgeBg: 'bg-amber-500',
    checkColor: 'text-amber-600',
  },
  {
    icon: '💼',
    tag: 'EMPLOYEE RECOGNITION',
    title: 'Recognize & Reward Your Team',
    description: 'Transform your recognition program with meaningful, customized gifts. Boost morale and strengthen company culture.',
    benefits: ['Custom Branding', 'Bulk Pricing', 'Full Personalization'],
    offer: 'Exclusive Pricing',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1000&h=1000&fit=crop',
    cta: 'Build Your Pack',
    ctaLink: '/builder',
    gradient: 'from-blue-400 via-cyan-400 to-blue-500',
    accentColor: 'text-blue-600',
    badgeBg: 'bg-blue-500',
    checkColor: 'text-blue-600',
  },
];

export function GiftingMomentsSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
      <div className="container-gc">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center mb-24"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 bg-em/10 rounded-full px-6 py-3 mb-6"
          >
            <Sparkles className="w-4 h-4 text-em" />
            <span className="text-sm font-normal text-em uppercase tracking-widest">Special Collections</span>
          </motion.div>
          <h2 className="text-6xl sm:text-7xl lg:text-8xl font-normal text-slate-900 mb-6 leading-tight">
            Gifting for Every <span className="text-em italic">Moment</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Handpicked collections for your most important celebrations and recognition programs
          </p>
        </motion.div>

        {/* Moments Cards */}
        <div className="space-y-20">
          {MOMENTS.map((moment, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.2, duration: 0.6 }}
              className="group"
            >
              <Link href={moment.ctaLink}>
                <div className="relative overflow-hidden rounded-3xl cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500">
                  {/* Grid Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 items-stretch min-h-96 lg:min-h-[500px]">
                    {/* Image Side - with badge */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className={`relative overflow-hidden bg-gradient-to-br ${moment.gradient} flex items-center justify-center p-8 order-2 lg:order-1`}
                    >
                      {/* Animated background shapes */}
                      <div className="absolute inset-0">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full blur-3xl animate-float" />
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
                      </div>

                      {/* Image */}
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 2 }}
                        className="relative z-10 w-full h-full"
                      >
                        <Image
                          src={moment.image}
                          alt={moment.title}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-700"
                          unoptimized
                          priority={idx === 0}
                        />
                      </motion.div>

                      {/* Floating Badge */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.2 + 0.3 }}
                        className="absolute top-8 right-8 bg-white rounded-2xl px-6 py-4 shadow-xl z-20 backdrop-blur-sm"
                      >
                        <p className={`text-sm font-normal ${moment.accentColor} uppercase tracking-wider`}>Best Seller</p>
                        <p className="text-2xl font-normal text-slate-900">⭐ 4.9</p>
                      </motion.div>
                    </motion.div>

                    {/* Content Side */}
                    <div className="bg-white p-8 sm:p-12 lg:p-16 flex flex-col justify-center order-1 lg:order-2 relative overflow-hidden">
                      {/* Background accent */}
                      <div className={`absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br ${moment.gradient} opacity-5 rounded-full blur-3xl`} />

                      <div className="relative z-10">
                        {/* Tag */}
                        <motion.div
                          initial={{ opacity: 0, x: -30 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.2 + 0.1 }}
                          className="inline-flex items-center gap-3 mb-8"
                        >
                          <span className="text-4xl">{moment.icon}</span>
                          <span className={`text-xs font-normal uppercase tracking-[0.3em] ${moment.accentColor}`}>
                            {moment.tag}
                          </span>
                        </motion.div>

                        {/* Title */}
                        <motion.h3
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.2 + 0.15 }}
                          className="text-4xl sm:text-5xl lg:text-6xl font-normal text-slate-900 mb-6 leading-tight group-hover:text-em transition-colors duration-300"
                        >
                          {moment.title}
                        </motion.h3>

                        {/* Description */}
                        <motion.p
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          transition={{ delay: idx * 0.2 + 0.2 }}
                          className="text-lg text-slate-700 mb-10 leading-relaxed max-w-xl"
                        >
                          {moment.description}
                        </motion.p>

                        {/* Benefits - with better styling */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          transition={{ delay: idx * 0.2 + 0.25 }}
                          className="mb-10 space-y-4"
                        >
                          {moment.benefits.map((benefit, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -20 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.2 + 0.3 + i * 0.05 }}
                              className="flex items-center gap-4"
                            >
                              <div className={`${moment.badgeBg} rounded-full p-2 flex-shrink-0`}>
                                <CheckCircle className="w-5 h-5 text-white" />
                              </div>
                              <span className="font-normal text-slate-800 text-base">{benefit}</span>
                            </motion.div>
                          ))}
                        </motion.div>

                        {/* Offer Badge - larger and more prominent */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.2 + 0.35 }}
                          className={`mb-10 inline-block px-8 py-4 rounded-2xl font-normal text-white text-lg ${moment.badgeBg} shadow-lg`}
                        >
                          {moment.offer}
                        </motion.div>

                        {/* CTA - enhanced */}
                        <motion.div
                          whileHover={{ x: 16 }}
                          className={`inline-flex items-center gap-3 font-normal text-xl ${moment.accentColor} group-hover:gap-5 transition-all duration-300`}
                        >
                          {moment.cta}
                          <motion.div
                            whileHover={{ x: 8, rotate: 15 }}
                          >
                            <ArrowRight className="w-7 h-7" />
                          </motion.div>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}
