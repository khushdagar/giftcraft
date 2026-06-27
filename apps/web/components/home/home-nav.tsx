'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, User, Menu, X } from 'lucide-react';
import { usePackStore } from '@/lib/store/pack-store';

export function HomeNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const count = usePackStore((state) => state.count);

  const occasions = [
    { name: 'Diwali', icon: '🪔' },
    { name: 'Holi', icon: '🌸' },
    { name: 'Christmas', icon: '🎄' },
    { name: 'Women\'s Day', icon: '💐' },
    { name: 'Onboarding', icon: '👔' },
    { name: 'Client Appreciation', icon: '🤝' },
  ];

  return (
    <nav className="sticky top-0 z-50 h-14 flex items-center justify-between px-4 md:px-6 bg-white/72 backdrop-blur-xl border-b border-[#D2D2D7]/30">
      <Link href="/" className="text-xl text-[#1A6B4F] font-medium font-serif italic">
        GiftCraft
      </Link>

      {/* Desktop Links */}
      <div className="hidden lg:flex gap-7 items-center text-sm">
        <Link href="/" className="text-[#1A1A18] font-medium hover:text-[#1A6B4F]">Home</Link>
        <Link href="/catalog" className="text-[#6B6B63] font-medium hover:text-[#1A1A18]">Products</Link>
        <Link href="#" className="text-[#6B6B63] font-medium hover:text-[#1A1A18]">Packs</Link>

        {/* Occasions Dropdown */}
        <div className="relative group">
          <button className="text-[#6B6B63] font-medium hover:text-[#1A1A18]">Occasions ▾</button>
          <div className="absolute top-full left-0 hidden group-hover:grid grid-cols-3 gap-1 bg-white/72 backdrop-blur-xl border border-[#D2D2D7]/30 rounded-xl p-4 min-w-[400px] shadow-lg">
            {occasions.map(occ => (
              <Link key={occ.name} href="/catalog" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#F5F5F0] transition text-sm font-medium text-[#6B6B63] hover:text-[#1A1A18]">
                <span className="text-lg">{occ.icon}</span>
                {occ.name}
              </Link>
            ))}
          </div>
        </div>

        <Link href="#" className="text-[#6B6B63] font-medium hover:text-[#1A1A18]">Pricing</Link>
        <Link href="#" className="text-[#6B6B63] font-medium hover:text-[#1A1A18]">Blog</Link>
        <Link href="#" className="text-[#6B6B63] font-medium hover:text-[#1A1A18]">Contact</Link>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        <Link href="/builder" className="hidden md:inline-flex h-9 px-5 bg-[#1A6B4F] text-white text-sm font-semibold rounded-full hover:bg-[#145A42] transition">
          Get a Quote
        </Link>
        <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F5F5F0] transition text-[#6B6B63]">
          <User size={20} />
        </button>
        <Link href="/builder" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F5F5F0] transition text-[#6B6B63] relative">
          <ShoppingBag size={20} />
          {count > 0 && (
            <span className="absolute top-0 right-0 w-5 h-5 bg-[#1A6B4F] text-white text-xs font-bold rounded-full flex items-center justify-center">
              {count}
            </span>
          )}
        </Link>
        <button
          className="lg:hidden w-9 h-9 flex items-center justify-center text-[#1A1A18]"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="absolute top-14 left-0 right-0 bg-white border-b border-[#E8E8E3] p-4 flex flex-col gap-3 lg:hidden">
          <Link href="/" className="px-3 py-2 hover:bg-[#F5F5F0] rounded">Home</Link>
          <Link href="/catalog" className="px-3 py-2 hover:bg-[#F5F5F0] rounded">Products</Link>
          <Link href="/builder" className="px-3 py-2 bg-[#1A6B4F] text-white rounded-full font-semibold">Get a Quote</Link>
        </div>
      )}
    </nav>
  );
}
