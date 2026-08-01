'use client';

import { useState } from 'react';
import { useProductGallery } from '@/store/product-gallery';

interface ColorOption {
  name: string;
  hex: string;
  imageUrl?: string;
}

interface ColorSelectorProps {
  options?: ColorOption[];
  onSelect?: (color: ColorOption) => void;
  isDynamic?: boolean;
}

const DEFAULT_COLORS: ColorOption[] = [
  { name: 'Matte Black', hex: '#1a1a1a' },
  { name: 'Silver', hex: '#c0c0c0' },
  { name: 'Forest Green', hex: '#800020' },
  { name: 'Rose Gold', hex: '#b76e79' },
];

export function ColorSelector({ options = DEFAULT_COLORS, onSelect, isDynamic = true }: ColorSelectorProps) {
  const [selected, setSelected] = useState<ColorOption>((options && options.length > 0 ? options[0] : DEFAULT_COLORS[0])!);
  const setVariantImageUrl = useProductGallery((s) => s.setVariantImageUrl);

  const handleSelect = (color: ColorOption) => {
    setSelected(color);
    // Swap the gallery's main image to this colour's image (or clear it).
    setVariantImageUrl(color.imageUrl || null);
    onSelect?.(color);
  };

  // If no colors provided and isDynamic is true, show a note
  if (!options || options.length === 0) {
    return (
      <div className="mt-6">
        <p className="text-sm font-medium text-ink-3">
          Colour options will be shown based on product availability
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <p className="mb-3 text-sm font-medium text-ink">
        Colour: <span className="font-semibold">{selected.name}</span>
        {/* {isDynamic && <span className="ml-2 text-xs text-ink-3">(Dynamic)</span>} */}
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
