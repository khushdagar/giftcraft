'use client';

import { useState } from 'react';
import { ThumbnailStrip } from './thumbnail-strip';
import { ProductImageActions } from './product-image-actions';

// A gallery for curated packs: the main image is a MERGED COLLAGE of every
// member product's image (columns scale with count — 1–3 → n cols, 4–5 → 2,
// 6+ → 3). Thumbnails let you view the collage or any single product image.
export function PackImageGallery({
  images,
  productName,
  productId,
  slug,
}: {
  images: string[];
  productName: string;
  productId: string;
  slug: string;
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
      className={`absolute inset-0 grid bg-white`}
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoRows: '1fr' }}
    >
      {imgs.map((src, i) => (
        <div key={i} className="relative overflow-hidden bg-elevated">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      ))}
    </div>
  );

  return (
    // Mobile: thumbnails sit under the main image as a horizontal strip.
    // Desktop (lg+): they return to a column on the left.
    <div className="flex flex-col-reverse gap-3 lg:flex-row">
      {/* Thumbnails */}
      <ThumbnailStrip>
        <button
          type="button"
          onClick={() => setActive(0)}
          className={`relative h-16 w-16 flex-shrink-0 snap-start overflow-hidden rounded-md bg-elevated transition ${
            active === 0 ? '' : 'opacity-60 hover:opacity-100'
          }`}
          aria-label="View all products"
        >
          {collage('p-0.5')}
          {active === 0 && (
            <span className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-inset ring-em" />
          )}
        </button>
        {imgs.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i + 1)}
            className={`relative h-16 w-16 flex-shrink-0 snap-start overflow-hidden rounded-md bg-elevated transition ${
              active === i + 1 ? '' : 'opacity-60 hover:opacity-100'
            }`}
            aria-label={`Product ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
            {active === i + 1 && (
              <span className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-inset ring-em" />
            )}
          </button>
        ))}
      </ThumbnailStrip>

      {/* Main view */}
      <div className="relative flex-1">
        <ProductImageActions
          productId={productId}
          name={productName}
          slug={slug}
          image={imgs[0]}
        />
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
