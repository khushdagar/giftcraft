'use client';

import { useEffect, useRef, useState } from 'react';
import { ZoomIn } from 'lucide-react';
import { ThumbnailStrip } from './thumbnail-strip';
import { ProductImageActions } from './product-image-actions';
import { ImageLightbox } from './image-lightbox';

// Magnification factor — same as the standard product gallery, so a pack and a
// product zoom by an identical amount.
const ZOOM = 2.5;

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

  // Hover-zoom only makes sense with a real pointer (desktop); touch gets the
  // full-screen viewer instead. Mirrors ImageGallery.
  const [canZoom, setCanZoom] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setCanZoom(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Cursor position within the image as fractions (0–1) + whether we're zooming.
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState({ active: false, x: 0.5, y: 0.5 });
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setZoom((z) => ({
      ...z,
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    }));
  };

  if (imgs.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-md bg-elevated">
        <span className="text-[120px] opacity-60">📦</span>
      </div>
    );
  }

  const n = imgs.length;
  const cols = n <= 1 ? 1 : n <= 3 ? n : n <= 5 ? 2 : 3;

  const collage = () => (
    <div
      className="absolute inset-0 grid bg-white"
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

  // The main view is rendered twice — once at 1x in the frame, once scaled
  // inside the magnifier panel — so the collage magnifies as one picture rather
  // than needing a separate composited image.
  const mainView = () =>
    active === 0 ? (
      collage()
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imgs[active - 1]}
        alt={productName}
        className="absolute inset-0 h-full w-full object-cover"
      />
    );

  // Lens (the highlighted region on the main image) — sized 1/ZOOM of the box,
  // centred on the cursor and clamped inside the image.
  const lensFrac = 1 / ZOOM;
  const lensLeft = Math.min(Math.max(zoom.x - lensFrac / 2, 0), 1 - lensFrac);
  const lensTop = Math.min(Math.max(zoom.y - lensFrac / 2, 0), 1 - lensFrac);

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
          {collage()}
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

        {canZoom ? (
          // Desktop: hover to magnify (lens on the image + side panel).
          <div
            ref={containerRef}
            className="relative"
            onMouseEnter={() => setZoom((z) => ({ ...z, active: true }))}
            onMouseLeave={() => setZoom((z) => ({ ...z, active: false }))}
            onMouseMove={handleMouseMove}
          >
            <div className="relative aspect-square cursor-crosshair overflow-hidden rounded-md bg-elevated">
              {mainView()}
              {/* Lens highlighting the magnified region */}
              {zoom.active && (
                <div
                  className="pointer-events-none absolute border border-white/70 bg-white/25 shadow-sm"
                  style={{
                    left: `${lensLeft * 100}%`,
                    top: `${lensTop * 100}%`,
                    width: `${lensFrac * 100}%`,
                    height: `${lensFrac * 100}%`,
                  }}
                />
              )}
            </div>

            {/* Magnified panel — floats to the right of the image on hover. */}
            {zoom.active && (
              <div
                className="pointer-events-none absolute top-0 z-50 hidden aspect-square w-full overflow-hidden rounded-md border border-bdr bg-white shadow-2xl lg:block"
                style={{ left: 'calc(100% + 16px)' }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    transform: `scale(${ZOOM})`,
                    transformOrigin: `${zoom.x * 100}% ${zoom.y * 100}%`,
                  }}
                >
                  {mainView()}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Touch / no-pointer: tap to open the full-screen viewer.
          <div
            onClick={() => setLightboxOpen(true)}
            className="relative aspect-square cursor-zoom-in overflow-hidden rounded-md bg-elevated"
          >
            {mainView()}
            {/* Affordance so it's obvious the image is tappable. */}
            <span className="pointer-events-none absolute bottom-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-bdr bg-white/90 shadow-sm backdrop-blur">
              <ZoomIn className="h-4 w-4 text-ink" />
            </span>
          </div>
        )}
      </div>

      {/* Full-screen viewer. The collage is not a single file, so opening it
          starts on the first member image and swipes through the rest. */}
      <ImageLightbox
        images={imgs}
        index={active === 0 ? 0 : active - 1}
        onIndexChange={(i) => setActive(i + 1)}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        productName={productName}
      />
    </div>
  );
}
