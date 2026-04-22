'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { formatRupees } from '@/lib/utils';

interface Packaging {
  id: string;
  name: string;
  price: number;
}

export function PackagingSelector({ productId }: { productId: string }) {
  const [selected, setSelected] = useState<string | null>(null);

  const { data: packagingOptions = [] } = useQuery<Packaging[]>({
    queryKey: ['packaging', productId],
    queryFn: async () => {
      const res = await fetch('/api/packaging');
      if (!res.ok) throw new Error('Failed to fetch packaging');
      return res.json();
    },
    staleTime: 5 * 60_000,
  });

  if (!packagingOptions.length) return null;

  return (
    <div>
      <p className="overline mb-3 text-ink-3">PACKAGING</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {packagingOptions.map((pkg) => (
          <button
            key={pkg.id}
            onClick={() => setSelected(pkg.id)}
            className={`rounded-gc border-2 p-4 text-left transition ${
              selected === pkg.id
                ? 'border-em bg-em-50'
                : 'border-bdr hover:border-em-300 bg-white'
            }`}
          >
            <p className="text-sm font-semibold text-ink">{pkg.name}</p>
            {pkg.price > 0 && (
              <p className="mt-1 text-xs text-ink-2">+{formatRupees(pkg.price)}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
