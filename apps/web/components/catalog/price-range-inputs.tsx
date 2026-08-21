'use client';

import { useEffect, useState } from 'react';

/**
 * Typed min/max boxes that sit under a price slider. The slider is fine for a
 * rough band; these are for "I want exactly ₹500–₹800".
 *
 * The boxes hold raw text while being edited (so a field can be emptied) and
 * only commit on blur or Enter, clamped into the bounds and ordered so min
 * never crosses max.
 */
export function PriceRangeInputs({
  min,
  max,
  boundMin,
  boundMax,
  onCommit,
}: {
  min: number;
  max: number;
  boundMin: number;
  boundMax: number;
  onCommit: (min: number, max: number) => void;
}) {
  const [draftMin, setDraftMin] = useState(String(min));
  const [draftMax, setDraftMax] = useState(String(max));

  // Slider moves / filter resets flow back into the boxes.
  useEffect(() => setDraftMin(String(min)), [min]);
  useEffect(() => setDraftMax(String(max)), [max]);

  const clamp = (v: number) => Math.min(Math.max(v, boundMin), boundMax);

  const commit = (which: 'min' | 'max') => {
    const parsed = Number.parseInt((which === 'min' ? draftMin : draftMax).replace(/[^\d]/g, ''), 10);
    if (Number.isNaN(parsed)) {
      // Empty or junk — snap back to the bound on that side.
      if (which === 'min') onCommit(boundMin, max);
      else onCommit(min, boundMax);
      return;
    }
    const value = clamp(parsed);
    if (which === 'min') onCommit(Math.min(value, max), max);
    else onCommit(min, Math.max(value, min));
  };

  const box =
    'w-full h-9 pl-6 pr-2 rounded-lg border text-sm tabular-nums focus:outline-none focus:border-[#800020]';

  return (
    <div className="flex items-center gap-2">
      {(['min', 'max'] as const).map((which) => (
        <div key={which} className="relative flex-1">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">₹</span>
          <input
            type="text"
            inputMode="numeric"
            aria-label={which === 'min' ? 'Minimum price' : 'Maximum price'}
            placeholder={which === 'min' ? 'Min' : 'Max'}
            value={which === 'min' ? draftMin : draftMax}
            onChange={(e) =>
              which === 'min' ? setDraftMin(e.target.value) : setDraftMax(e.target.value)
            }
            onBlur={() => commit(which)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit(which);
                (e.target as HTMLInputElement).blur();
              }
            }}
            className={box}
            style={{ borderColor: '#D3CBBC', background: '#FFF', color: '#222222' }}
          />
        </div>
      ))}
    </div>
  );
}
