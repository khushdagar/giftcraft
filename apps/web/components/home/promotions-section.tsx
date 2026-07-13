"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function PromotionsSection() {
  return (
    <section className="relative py-20 overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-em via-emerald-500 to-teal-500" />

      {/* Animated background shapes */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
      <div
        className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-float"
        style={{ animationDelay: "2s" }}
      />

      {/* Content */}
      <div className="relative z-10 container-gc">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full mb-8 border border-white/30"
          >
            <Sparkles className="w-5 h-5 text-white" />
            <span className="text-white font-normal uppercase tracking-wider text-sm">
              Limited Time Offer
            </span>
          </motion.div>

          {/* Main Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-6xl sm:text-7xl lg:text-8xl font-normal text-white mb-6 leading-tight"
          >
            Save <span className="text-white drop-shadow-lg">50%</span>
            <br />
            on Bulk Orders
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl text-white/95 mb-12 font-normal leading-relaxed max-w-2xl mx-auto"
          >
            Minimum ₹5,000 • Free Customization • Fast Delivery • Quality
            Guaranteed
          </motion.p>

          {/* Offer Highlights */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-12 max-w-2xl mx-auto"
          >
            {[
              { label: "Screen Print", icon: "🖨️" },
              { label: "Embroidery", icon: "✨" },
              { label: "Express Shipping", icon: "⚡" },
            ].map((offer, idx) => (
              <div
                key={idx}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4"
              >
                <p className="text-3xl mb-2">{offer.icon}</p>
                <p className="text-white font-normal text-sm">{offer.label}</p>
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-10"
          >
            <Link href="/catalog">
              <motion.button
                whileHover={{ scale: 1.08, y: -4 }}
                className="flex items-center gap-3 bg-white text-em font-normal py-5 px-10 rounded-2xl text-lg transition-all shadow-2xl hover:shadow-2xl group"
              >
                Shop Now
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </motion.button>
            </Link>
            <Link href="/builder">
              <motion.button
                whileHover={{ scale: 1.08, y: -4 }}
                className="flex items-center gap-3 bg-white/20 backdrop-blur-sm border-2 border-white text-white font-normal py-5 px-10 rounded-2xl text-lg transition-all hover:bg-white/30"
              >
                Build Gift Pack
                <ArrowRight className="w-6 h-6" />
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}
