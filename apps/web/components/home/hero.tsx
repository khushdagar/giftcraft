'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export function HomeHero() {
  const [slide, setSlide] = useState(0);

  const slides = [
    {
      subtitle: 'India\'s First Gifting Studio',
      title: 'Bulk Gifting.\nPerfectly Crafted.',
      desc: 'Custom branded gifts for your team, delivered in 10 days.',
      bg: 'linear-gradient(135deg, #2a1f14 0%, #1a1510 20%, #12100d 50%, #1a1510 80%, #2a1f14 100%)',
      image: '/home-banners/Banners-01.png',
    },
    {
      subtitle: 'Festive Season 2026',
      title: 'Diwali Gifting\nMade Simple.',
      desc: 'Premium branded gifts for the season of lights.',
      bg: 'linear-gradient(135deg, #5C2D0E 0%, #8B4513 50%, #D4872A 100%)',
      image: '/home-banners/Banners-02.png',
    },
    {
      subtitle: 'Employee Onboarding',
      title: 'Welcome Kits\nThat Wow.',
      desc: 'Make every new hire feel valued from day one.',
      bg: 'linear-gradient(135deg, #0A3726 0%, #1A6B4F 50%, #2A7EC4 100%)',
      image: '/home-banners/Banners-03.png',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide(prev => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative min-h-[540px] py-20 md:h-[600px] md:py-0 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        {slides.map((s, i) => (
          <div
            key={i}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
              slide === i ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ background: s.bg, backgroundImage: `url(${s.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
        ))}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="relative z-10 text-center max-w-2xl px-6 pb-14 md:pb-0">
        {(() => {
          const current = slides[slide] ?? slides[0]!;
          return (
            <>
              <p className="text-sm md:text-base font-semibold uppercase tracking-widest text-[#EDD5A3] mb-4">
                {current.subtitle}
              </p>
              <h1 className="text-4xl sm:text-5xl md:text-7xl text-white mb-4 leading-tight whitespace-pre-line font-serif font-normal">
                {current.title}
              </h1>
              <p className="text-lg md:text-xl text-white/70 mb-8">
                {current.desc}
              </p>
            </>
          );
        })()}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
          <Link href="/builder" className="w-full sm:w-auto text-center px-8 py-4 bg-white text-[#1A1A18] rounded-full font-semibold hover:bg-[#1A6B4F] hover:text-white transition">
            Build Your Gift
          </Link>
          <Link href="/catalog" className="w-full sm:w-auto text-center px-8 py-4 border-2 border-white/30 text-white rounded-full font-semibold hover:border-white hover:bg-white/10 transition">
            Browse Catalog
          </Link>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlide(i)}
            className={`transition-all ${
              slide === i ? 'w-8 h-2 bg-white' : 'w-2 h-2 bg-white/40'
            } rounded-full`}
          />
        ))}
      </div>
    </section>
  );
}
