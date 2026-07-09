'use client';

import { useState } from 'react';

// A gallery for curated packs: the main image is a MERGED COLLAGE of every
// member product's image (columns scale with count — 1–3 → n cols, 4–5 → 2,
// 6+ → 3). Thumbnails let you view the collage or any single product image.
export function PackImageGallery({
  images,
  productName,
}: {
  images: string[];
  productName: string;
}) {
  const imgs = images.filter(Boolean);
  const [active, setActive] = useState(0); // 0 = collage, 1..n = single image

  if (imgs.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-md bg-elevated">
        <span className="text-[120px] opacity-60">📦</span>
      </div>
    );
  }

  const n = imgs.length;
  const cols = n <= 1 ? 1 : n <= 3 ? n : n <= 5 ? 2 : 3;

  const collage = (padding: string) => (
    <div
      className={`absolute inset-0 grid gap-1 bg-white ${padding}`}
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoRows: '1fr' }}
    >
      {imgs.map((src, i) => (
        <div key={i} className="relative overflow-hidden rounded-sm bg-elevated">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex gap-3">
      {/* Thumbnails */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setActive(0)}
          className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-elevated transition ${
            active === 0 ? 'ring-2 ring-em' : 'opacity-60 hover:opacity-100'
          }`}
          aria-label="View all products"
        >
          {collage('p-0.5')}
        </button>
        {imgs.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i + 1)}
            className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-elevated transition ${
              active === i + 1 ? 'ring-2 ring-em' : 'opacity-60 hover:opacity-100'
            }`}
            aria-label={`Product ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
          </button>
        ))}
      </div>

      {/* Main view */}
      <div className="flex-1">
        <div className="relative aspect-square overflow-hidden rounded-md bg-elevated">
          {active === 0 ? (
            collage('p-1.5')
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgs[active - 1]}
              alt={productName}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
        </div>
      </div>
    </div>
  );
}
