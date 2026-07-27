'use client';

import { motion } from 'framer-motion';

const STEPS = [
  {
    number: 1,
    title: 'Get Started',
    desc: 'Browse our collection or book a demo. Our team will help you find the perfect products.',
  },
  {
    number: 2,
    title: 'Customize & Design',
    desc: 'Add your logo, choose branding options, and personalize with colors.',
  },
  {
    number: 3,
    title: 'Approve Mockup',
    desc: 'Review mockups of your branded gifts and approve the final design.',
  },
  {
    number: 4,
    title: 'Fast Production',
    desc: 'Our team handles quality checks, assembly, and packaging.',
  },
  {
    number: 5,
    title: 'Ship Anywhere',
    desc: 'We deliver to 50+ cities with tracking or store for later.',
  },
  {
    number: 6,
    title: 'Enjoy Results',
    desc: 'Your gifts delivered! Track engagement and plan your next campaign.',
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-16 bg-white">
      <div className="container-gc">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <span className="text-xs font-normal text-em uppercase tracking-widest block mb-2">OUR PROCESS</span>
          <h2 className="text-4xl sm:text-5xl font-normal mb-4">How It Works</h2>
          <p className="text-base text-slate-600 max-w-2xl">
            From concept to delivery, GIVOO handles every detail of your branded merchandise journey.
          </p>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Video */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden h-[500px] sm:h-[550px] border rounded-sm"
          >
            <video
              className="w-full h-full object-contain"
              autoPlay
              loop
              muted
              playsInline
              controls
            >
              <source src="/how-it-work.mp4" type="video/mp4" />
            </video>
          </motion.div>

          {/* Right Side - Steps */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {STEPS.map((step, idx) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="flex gap-4 group items-start"
              >
                {/* Step Number */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="flex-shrink-0"
                >
                  <div className="w-8 h-8 rounded-full bg-em flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                    <span className="text-base font-normal text-white">{step.number}</span>
                  </div>
                </motion.div>

                {/* Step Content */}
                <div className="flex-1 pt-1 -mt-1">
                  <h3 className="text-xl font-medium text-slate-900 mb-1 group-hover:text-em transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-snug">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="pt-4"
            >
              <a
                href="/builder"
                className="inline-flex items-center gap-2 bg-em hover:bg-em-600 text-white font-normal py-3 px-8 rounded-xl text-base transition-all hover:shadow-lg active:scale-95"
              >
                Get Started
                <span>→</span>
              </a>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
