'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { formatRupees } from '@/lib/utils';

interface Addon {
  id: string;
  name: string;
  price: number;
}

export function AddonsSelector({ productId }: { productId: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: addons = [] } = useQuery<Addon[]>({
    queryKey: ['addons', productId],
    queryFn: async () => {
      const res = await fetch('/api/addons');
      if (!res.ok) throw new Error('Failed to fetch addons');
      return res.json();
    },
    staleTime: 5 * 60_000,
  });

  if (!addons.length) return null;

  const toggleAddon = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  const totalAddonsPrice = Array.from(selected).reduce((sum, id) => {
    const addon = addons.find((a) => a.id === id);
    return sum + (addon?.price || 0);
  }, 0);

  return (
    <div>
      <p className="overline mb-3 text-ink-3">ADD-ONS</p>
      <div className="flex flex-wrap gap-2">
        {addons.map((addon) => {
          const isSelected = selected.has(addon.id);
          return (
            <button
              key={addon.id}
              onClick={() => toggleAddon(addon.id)}
              className={`rounded-md-p px-4 py-2 text-xs font-semibold transition ${
                isSelected
                  ? 'bg-em text-inv'
                  : 'border border-bdr text-ink hover:border-em'
              }`}
            >
              {addon.name} {addon.price > 0 ? `+${formatRupees(addon.price)}` : '(Free)'}
            </button>
          );
        })}
      </div>
      {totalAddonsPrice > 0 && (
        <p className="mt-3 text-sm text-ink-2">
          Add-ons total: <span className="font-semibold">{formatRupees(totalAddonsPrice)}</span>
        </p>
      )}
    </div>
  );
}
