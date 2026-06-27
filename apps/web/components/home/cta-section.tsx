'use client';

import Link from 'next/link';

export function CTASection() {
  return (
    <section className="bg-[#1A1A18] text-white py-20 md:py-40 text-center">
      <div className="container">
        <h2 className="text-5xl md:text-6xl font-serif font-normal mb-4">
          Ready to craft the<br />
          <span className="italic">perfect gift?</span>
        </h2>
        <p className="text-lg text-white/50 mb-12 max-w-lg mx-auto">
          Start building your custom gift pack in under 5 minutes. No signup required to explore.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/builder" className="px-8 py-4 bg-white text-[#1A1A18] rounded-full font-semibold hover:bg-[#F5F5F0] transition">
            Build Your Gift
          </Link>
          <Link href="/catalog" className="px-8 py-4 border-2 border-white/30 text-white rounded-full font-semibold hover:border-white transition">
            Browse Catalog
          </Link>
        </div>
      </div>
    </section>
  );
}
