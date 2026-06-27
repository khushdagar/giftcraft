'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

export function CuratedCollections() {
  const { data: collections, isLoading } = useQuery({
    queryKey: ['collections', 'homepage'],
    queryFn: async () => {
      const res = await fetch('/api/collections');
      if (!res.ok) throw new Error('Failed to fetch collections');
      return res.json();
    },
  });

  // Diagonal gradients (brighter top-left → deeper bottom-right) per card.
  const gradients = [
    'linear-gradient(145deg, #D7AC55 0%, #9A6E2E 55%, #6F4D1E 100%)', // gold
    'linear-gradient(145deg, #34332F 0%, #1A1A18 55%, #0C0C0B 100%)', // charcoal
    'linear-gradient(145deg, #3FA978 0%, #1F8A5C 45%, #134E36 100%)', // emerald
  ];

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container">
        <h2 className="text-4xl md:text-5xl text-center mb-2 font-serif font-normal">
          Curated <span className="italic text-[#1A6B4F]">collections.</span>
        </h2>
        <p className="text-center text-[#6B6B63] text-sm mb-12">
          Hand-picked gifts for every budget and occasion.
        </p>

        {/* First Row - 2 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {isLoading ? (
            <>
              <div className="rounded-3xl h-48 md:h-64 bg-[#E8E8E3] animate-pulse" />
              <div className="rounded-3xl h-48 md:h-64 bg-[#E8E8E3] animate-pulse" />
            </>
          ) : (
            collections?.slice(0, 2).map((col: any, idx: number) => {
              const titles = [
                <>Budget-Friendly<br />Under ₹500</>,
                <>Premium Executive<br />Collection</>
              ];
              return (
              <Link
                key={col.id}
                href={`/collections/${col.id}`}
                className="rounded-3xl p-8 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer relative h-48 md:h-[400px] flex flex-col justify-end"
                style={{ background: gradients[idx] }}
              >
                <div className="relative z-10">
                  <h3 className="text-2xl md:text-3xl text-white mb-2 font-normal leading-snug font-serif">
                    {titles[idx]}
                  </h3>
                  <p className="text-white/80 text-xs md:text-sm mb-4">
                    {col.description}
                  </p>
                  <span className="text-white text-sm font-medium">
                    Browse Collection →
                  </span>
                </div>
              </Link>
            )
            })
          )}
        </div>

        {/* Second Row - Full Width Card */}
        {!isLoading && collections && collections.length > 2 && (
          <div className="grid grid-cols-1">
            {collections?.slice(2, 3).map((col: any) => (
              <Link
                key={col.id}
                href={`/collections/${col.id}`}
                className="rounded-3xl p-8 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer relative h-40 md:h-[400px] flex flex-col justify-end"
                style={{ background: gradients[2] }}
              >
                <div className="relative z-10">
                  <h3 className="text-2xl md:text-3xl text-white mb-2 font-normal leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                    {col.name}
                  </h3>
                  <p className="text-white/80 text-xs md:text-sm mb-4" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    {col.description}
                  </p>
                  <span className="text-white text-sm font-medium" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    Browse Collection →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
