'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

export function CuratedCollections() {
  const { data: collections, isLoading } = useQuery({
    queryKey: ['collections', 'homepage'],
    queryFn: async () => {
      // Curated Collections managed in the admin dashboard (GiftCollection).
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
    'linear-gradient(145deg, #4A90D9 0%, #2D5A9E 55%, #1A3C6E 100%)', // navy/blue
  ];

  const count = collections?.length ?? 0;

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container">
        <h2 className="text-4xl md:text-5xl text-center mb-2 font-serif font-normal">
          Curated <span className="italic text-[#1A6B4F]">collections.</span>
        </h2>
        <p className="text-center text-[#6B6B63] text-sm mb-12">
          Hand-picked gifts for every budget and occasion.
        </p>

        {/* 2-up grid. An odd final card spans full width (keeps the original
            "2 cards + 1 wide" look for 3 collections; 2×2 for 4). */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoading ? (
            <>
              <div className="rounded-3xl h-48 md:h-64 bg-[#E8E8E3] animate-pulse" />
              <div className="rounded-3xl h-48 md:h-64 bg-[#E8E8E3] animate-pulse" />
            </>
          ) : (
            collections?.map((col: any, idx: number) => {
              const isLastOdd = count % 2 === 1 && idx === count - 1;
              return (
                <Link
                  key={col.id}
                  href={`/packs?collection=${col.slug}`}
                  className={`rounded-3xl p-8 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer relative h-48 md:h-[400px] flex flex-col justify-end ${
                    isLastOdd ? 'md:col-span-2' : ''
                  }`}
                  style={
                    col.image
                      ? undefined
                      : { background: col.gradient || gradients[idx % gradients.length] }
                  }
                >
                  {col.image && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={col.image}
                        alt={col.name}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    </>
                  )}
                  <div className="relative z-10">
                    <h3 className="text-2xl md:text-3xl text-white mb-2 font-normal leading-snug font-serif">
                      {col.name}
                    </h3>
                    <p className="text-white/80 text-xs md:text-sm mb-4">
                      {col.description}
                    </p>
                    <span className="text-white text-sm font-medium">
                      Browse Collection →
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
