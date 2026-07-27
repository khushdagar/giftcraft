'use client';

import Link from 'next/link';

export function CheckoutNav() {
  return (
    <nav className="sticky top-0 z-50 h-14 flex items-center justify-between px-4 md:px-6 bg-white/72 backdrop-blur-xl border-b border-[#D2D2D7]/30">
      <Link href="/" className="font-serif text-lg text-[#1A6B4F] italic font-medium">
        GIVOO
      </Link>
      <span className="text-sm text-[#6B6B63] flex items-center gap-1.5">
        🔒 Secure Checkout
      </span>
      <Link href="/builder" className="text-sm text-[#1A6B4F] font-medium hover:opacity-70 transition">
        ← Back to Builder
      </Link>
    </nav>
  );
}
