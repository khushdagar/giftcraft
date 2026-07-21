'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

export function ShopByOccasion() {
  const occasionColors: { [key: string]: string } = {
    'Diwali': 'linear-gradient(135deg, #C4963C 0%, #8B6F47 100%)',
    'Holi': 'linear-gradient(135deg, #E94B9D 0%, #F5C842 50%, #2FA877 100%)',
    'Christmas & New Year': 'linear-gradient(135deg, #6B1B1B 0%, #2B5A3B 100%)',
    'Women\'s Day': 'linear-gradient(135deg, #D946A6 0%, #A855A8 100%)',
    'Employee Onboarding': 'linear-gradient(135deg, #0F766E 0%, #1E40AF 100%)',
    'Client Appreciation': 'linear-gradient(135deg, #3F3F46 0%, #1F2937 100%)',
    'Birthday': 'linear-gradient(135deg, #7C3AED 0%, #DC2626 50%, #EA580C 100%)',
    'Work Anniversary': 'linear-gradient(135deg, #B8860B 0%, #654321 100%)',
    'Farewell': 'linear-gradient(135deg, #0F766E 0%, #059669 100%)',
  };

  const { data: occasions, isLoading } = useQuery({
    queryKey: ['occasions'],
    queryFn: async () => {
      const res = await fetch('/api/occasions');
      if (!res.ok) throw new Error('Failed to fetch occasions');
      return res.json();
    },
  });

  return (
    <section className="py-16 md:py-24 bg-[#FAFAF7]">
      <div className="container">
        <h2 className="text-4xl md:text-5xl text-center mb-2 font-serif font-normal">
          Shop by <span className="italic text-[#1A6B4F]">occasion.</span>
        </h2>
        <p className="text-center text-[#6B6B63] text-sm mb-12">
          Find the perfect gift for every moment that matters.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl aspect-[3/2] bg-[#E8E8E3] animate-pulse" />
            ))
          ) : (
            occasions?.map((occ: any) => (
              <Link
                key={occ.name}
                href={`/catalog?occasion=${occ.slug}`}
                className="rounded-3xl overflow-hidden aspect-[3/2] group cursor-pointer relative shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-600" style={{ background: occasionColors[occ.name] || occ.bg }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white z-10">
                  {/* <div className="text-2xl mb-2">{occ.icon}</div> */}
                  <h3 className="text-lg md:text-xl font-bold font-serif mb-1">{occ.name}</h3>
                  <p className="text-xs md:text-sm text-white/80">{occ.description}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
