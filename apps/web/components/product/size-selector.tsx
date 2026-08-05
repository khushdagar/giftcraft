'use client';

import { useState } from 'react';

interface SizeSelectorProps {
  options?: Array<{ name: string }>;
  onSelect?: (name: string) => void;
}

export function SizeSelector({ options, onSelect }: SizeSelectorProps) {
  const [selected, setSelected] = useState(options?.[0]?.name || '');

  const handleSelect = (name: string) => {
    setSelected(name);
    onSelect?.(name);
  };

  if (!options || options.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 space-y-3">
      <label className="block text-sm font-semibold text-ink">
        Size
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.name}
            onClick={() => handleSelect(option.name)}
            className={`px-4 py-2 rounded-lg border-2 font-medium transition ${
              selected === option.name
                ? 'border-em bg-em/10 text-em'
                : 'border-bdr text-ink-2 hover:border-ink-3'
            }`}
          >
            {option.name}
          </button>
        ))}
      </div>
    </div>
  );
}
