'use client';

import { useState } from 'react';
import { useProductGallery } from '@/store/product-gallery';

interface ColorOption {
  name: string;
  hex: string;
  imageUrl?: string;
}

interface ColorSelectorProps {
  /** Real colour variants. Omit or pass an empty array to render nothing. */
  options?: ColorOption[];
  onSelect?: (color: ColorOption) => void;
}

export function ColorSelector({ options, onSelect }: ColorSelectorProps) {
  const [selected, setSelected] = useState<ColorOption | null>(options?.[0] ?? null);
  const setVariantImageUrl = useProductGallery((s) => s.setVariantImageUrl);

  const handleSelect = (color: ColorOption) => {
    setSelected(color);
    // Swap the gallery's main image to this colour's image (or clear it).
    setVariantImageUrl(color.imageUrl || null);
    onSelect?.(color);
  };

  // A product with no colour variants has no colours to offer. This used to
  // fall back to four placeholder swatches, which advertised colourways that
  // did not exist — the caller passes `undefined` here, so a default parameter
  // silently took over and the empty-state check below never ran.
  if (!options || options.length === 0 || !selected) return null;

  return (
    <div className="mt-6">
      <p className="mb-3 text-sm font-medium text-ink">
        Colour: <span className="font-semibold">{selected.name}</span>
      </p>
      <div className="flex flex-wrap gap-3">
        {options.map((color) => (
          <button
            key={color.name}
            onClick={() => handleSelect(color)}
            className={`h-10 w-10 overflow-hidden rounded-full border transition ${
              selected.name === color.name
                ? 'border-ink ring-2 ring-ink ring-offset-2'
                : 'border-bdr hover:border-ink'
            }`}
            style={color.imageUrl ? undefined : { backgroundColor: color.hex }}
            title={color.name}
          >
            {color.imageUrl && (
              // Show the variant image as the swatch when one was uploaded.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={color.imageUrl} alt={color.name} className="h-full w-full object-cover" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
