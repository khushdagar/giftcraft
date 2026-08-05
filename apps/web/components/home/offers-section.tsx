'use client';

import { motion } from 'framer-motion';

const OFFERS = [
  { title: 'FLASH SALE', desc: '50% OFF on Select Items', action: 'Ends in 2 days' },
  { title: 'BULK BUY', desc: 'Min ₹5000: Extra 10% OFF', action: 'Valid till month end' },
  { title: 'WELCOME', desc: 'First-time: ₹500 discount', action: 'Use WELCOME500' },
];

export function OffersSection() {
  return (
    <section className="bg-gradient-to-r from-red-50 to-orange-50 py-8">
      <div className="container-gc">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {OFFERS.map((offer, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.02 }}
              className="bg-white rounded-lg p-4 text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <p className="font-normal text-red-600 mb-1">{offer.title}</p>
              <p className="font-normal text-slate-900">{offer.desc}</p>
              <p className="text-xs text-slate-600 mt-2">{offer.action}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
