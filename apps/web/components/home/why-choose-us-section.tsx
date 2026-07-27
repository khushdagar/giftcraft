'use client';

import { motion } from 'framer-motion';
import { Shield, DollarSign, Zap, CheckCircle, Palette, MapPin, Headphones } from 'lucide-react';

const FEATURES = [
  {
    icon: DollarSign,
    title: 'Transparent Pricing',
    desc: 'What you see is what you pay. No surprises ever.',
    bg: 'from-amber-50 to-orange-50',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  {
    icon: Zap,
    title: 'Fast Turnaround',
    desc: '7-14 days standard. Rush options available.',
    bg: 'from-orange-50 to-red-50',
    border: 'border-orange-200',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
  },
  {
    icon: CheckCircle,
    title: 'Quality Assured',
    desc: 'Every product personally tested & curated.',
    bg: 'from-emerald-50 to-teal-50',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    icon: Palette,
    title: 'Full Customization',
    desc: 'Screen print, embroidery, engraving & more.',
    bg: 'from-violet-50 to-purple-50',
    border: 'border-violet-200',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
  },
  {
    icon: MapPin,
    title: 'Wide Reach',
    desc: 'Delivery across 50+ Indian cities.',
    bg: 'from-sky-50 to-blue-50',
    border: 'border-sky-200',
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
  },
  {
    icon: Headphones,
    title: 'Expert Support',
    desc: 'Gifting experts, not just salespeople.',
    bg: 'from-pink-50 to-rose-50',
    border: 'border-pink-200',
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-600',
  },
];

export function WhyChooseUsSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-white to-slate-50">
      <div className="container-gc">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="mb-16 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-em" />
            <span className="text-sm font-normal text-em uppercase tracking-wider">Why GIVOO</span>
          </div>
          <h2 className="text-5xl font-normal text-slate-900 mb-4">Why Teams Love Us</h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            The only corporate gifting platform that treats you like a partner, not a transaction
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                whileHover={{ y: -12, boxShadow: '0 25px 50px rgba(0,0,0,0.1)' }}
              >
                <div
                  className={`h-full bg-gradient-to-br ${feature.bg} border-2 ${feature.border} rounded-3xl p-8
                  hover:shadow-xl transition-all duration-300 group`}
                >
                  {/* Icon */}
                  <div className={`${feature.iconBg} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-8 h-8 ${feature.iconColor}`} />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-normal text-slate-900 mb-3 leading-tight">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-700 text-base leading-relaxed font-medium">
                    {feature.desc}
                  </p>

                  {/* Accent line */}
                  <div className="mt-6 h-1 w-12 bg-gradient-to-r from-em to-emerald-400 rounded-full" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
