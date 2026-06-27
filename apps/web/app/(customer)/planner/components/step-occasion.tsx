'use client';

import { useQuery } from '@tanstack/react-query';

interface StepOccasionProps {
  onSelect: (occasion: string) => void;
}

interface ApiOccasion {
  icon: string;
  name: string;
  desc: string;
  bg: string;
  slug: string;
}

// Soft pastel tiles, rotated across occasions so the grid stays colorful
// regardless of how many occasions the catalogue has.
const TILE_BG = [
  'bg-em-50',
  'bg-gold-50',
  'bg-[#EEF2FF]',
  'bg-[#FFF1F2]',
  'bg-[#F0FDFA]',
  'bg-[#F0F9FF]',
  'bg-[#FFF7ED]',
  'bg-[#F5F3FF]',
];

export function StepOccasion({ onSelect }: StepOccasionProps) {
  const { data: occasions, isLoading, isError } = useQuery<ApiOccasion[]>({
    queryKey: ['planner', 'occasions'],
    queryFn: async () => {
      const res = await fetch('/api/occasions');
      if (!res.ok) throw new Error('Failed to load occasions');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-normal tracking-tight text-ink mb-2">
          What's the occasion?
        </h2>
        <p className="text-ink-2">
          Select an occasion to get personalized gift recommendations
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg p-6 h-[120px] bg-recessed animate-pulse"
            />
          ))}
        </div>
      ) : isError || !occasions || occasions.length === 0 ? (
        <div className="text-center py-10 bg-recessed rounded-lg">
          <p className="text-ink-2 mb-4">
            Couldn't load occasions right now.
          </p>
          <button
            onClick={() => onSelect('')}
            className="text-sm font-normal text-em hover:opacity-70"
          >
            Continue without an occasion →
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {occasions.map((occasion, idx) => (
              <button
                key={occasion.slug}
                onClick={() => onSelect(occasion.slug)}
                title={occasion.desc}
                className={`${TILE_BG[idx % TILE_BG.length]} rounded-lg p-6 text-center border-2 border-transparent hover:border-bdr transition group cursor-pointer`}
              >
                <div className="text-4xl mb-2 group-hover:scale-110 transition">
                  {occasion.icon}
                </div>
                <p className="font-normal text-sm text-ink group-hover:text-em transition">
                  {occasion.name}
                </p>
              </button>
            ))}
          </div>

          <div className="text-center pt-2">
            <button
              onClick={() => onSelect('')}
              className="text-sm text-ink-2 hover:text-em transition"
            >
              Not sure? Browse across all occasions →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
