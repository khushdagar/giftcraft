'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useProductGallery } from '@/store/product-gallery';
import { ThumbnailStrip } from './thumbnail-strip';
import { ProductImageActions } from './product-image-actions';
import { ImageLightbox } from './image-lightbox';
import { ZoomIn } from 'lucide-react';

interface ProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

// Magnification factor for the Flipkart-style hover zoom.
const ZOOM = 2.5;

export function ImageGallery({
  images,
  productName,
  productId,
  slug,
}: {
  images: ProductImage[];
  productName: string;
  productId: string;
  slug: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragStart, setDragStart] = useState(0);

  // A selected colour variant can override the displayed main image.
  const { variantImageUrl, setVariantImageUrl } = useProductGallery();

  // Hover-zoom only makes sense with a real pointer (desktop). On touch we keep
  // the swipe/drag behaviour instead.
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

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    setZoom((z) => ({ ...z, x, y }));
  };

  // Reset any carried-over variant image when the product (image set) changes.
  useEffect(() => {
    setVariantImageUrl(null);
  }, [images, setVariantImageUrl]);

  const sortedImages = [...(images || [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const baseImage = sortedImages[activeIndex] || { url: '', id: '0', isPrimary: true, sortOrder: 0 };
  // Variant image takes precedence over the manually-selected thumbnail.
  const activeImage = variantImageUrl ? { ...baseImage, url: variantImageUrl } : baseImage;

  // Framer calls this with (event, info) — taking only `info` here read the
  // event instead, so `offset.x` was undefined and swiping never changed image.
  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    const offset = dragStart - info.offset.x;
    if (Math.abs(offset) > 50) {
      const direction = offset > 0 ? 1 : -1;
      const nextIndex = Math.max(0, Math.min(sortedImages.length - 1, activeIndex + direction));
      setActiveIndex(nextIndex);
    }
  };

  // Touch/no-hover devices can't hover-zoom, so tapping the image opens a
  // full-screen viewer instead.
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Keep the active thumbnail in view when the main image is swiped.
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    thumbRefs.current[activeIndex]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [activeIndex]);

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
      {sortedImages.length > 1 && (
        <ThumbnailStrip>
          {sortedImages.map((img, i) => (
            <button
              key={img.id}
              onClick={() => { setActiveIndex(i); setVariantImageUrl(null); }}
              ref={(el) => { thumbRefs.current[i] = el; }}
              className={`relative w-16 h-16 flex-shrink-0 snap-start overflow-hidden rounded-md bg-elevated transition ${
                i === activeIndex && !variantImageUrl ? '' : 'opacity-60 hover:opacity-100'
              }`}
            >
              {img.url ? (
                <Image
                  src={img.url}
                  alt={`${productName} view ${i + 1}`}
                  fill
                  className="object-cover rounded-md"
                  sizes="64px"
                />
              ) : (
                <span className="text-2xl flex items-center justify-center w-full h-full">📦</span>
              )}
              {/* Selection outline drawn inside the tile, so it can't bleed into
                  neighbours or get clipped by the scroll container. */}
              {i === activeIndex && !variantImageUrl && (
                <span className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-inset ring-em" />
              )}
            </button>
          ))}
        </ThumbnailStrip>
      )}

      {/* Main image - Right side */}
      <div className="relative flex-1">
        <ProductImageActions
          productId={productId}
          name={productName}
          slug={slug}
          image={activeImage?.url || undefined}
        />
        {canZoom && activeImage?.url ? (
          // Desktop: hover to magnify (Flipkart-style side panel + lens).
          <div
            ref={containerRef}
            className="relative"
            onMouseEnter={() => setZoom((z) => ({ ...z, active: true }))}
            onMouseLeave={() => setZoom((z) => ({ ...z, active: false }))}
            onMouseMove={handleMouseMove}
          >
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-md bg-elevated cursor-crosshair">
              <Image
                src={activeImage.url}
                alt={productName}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
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

            {/* Magnified panel — floats to the right of the image on hover.
                Uses next/image (same proxied path as the main image) scaled and
                anchored to the cursor, so it loads reliably. */}
            {zoom.active && (
              <div
                className="pointer-events-none absolute top-0 z-50 hidden aspect-square w-full overflow-hidden rounded-md border border-bdr bg-white shadow-2xl lg:block"
                style={{ left: 'calc(100% + 16px)' }}
              >
                <Image
                  src={activeImage.url}
                  alt={productName}
                  fill
                  className="object-cover"
                  sizes="50vw"
                  style={{
                    transform: `scale(${ZOOM})`,
                    transformOrigin: `${zoom.x * 100}% ${zoom.y * 100}%`,
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          // Touch / no-pointer: swipe to change images, tap to open the viewer.
          <motion.div
            drag="x"
            dragElastic={0.2}
            onDragStart={() => setDragStart(0)}
            onDragEnd={handleDragEnd}
            onClick={activeImage?.url ? () => setLightboxOpen(true) : undefined}
            className="relative flex aspect-square items-center justify-center rounded-md bg-elevated overflow-hidden cursor-zoom-in"
          >
            {activeImage?.url ? (
              <Image
                src={activeImage.url}
                alt={productName}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <span className="text-[140px] opacity-70">📦</span>
              </div>
            )}

            {/* Affordance so it's obvious the image is tappable. */}
            {activeImage?.url && (
              <span className="pointer-events-none absolute bottom-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-bdr bg-white/90 shadow-sm backdrop-blur">
                <ZoomIn className="h-4 w-4 text-ink" />
              </span>
            )}
          </motion.div>
        )}
      </div>

      {/* Full-screen viewer. A selected colour variant shows on its own, since
          it isn't part of the product's image list. */}
      <ImageLightbox
        images={variantImageUrl ? [variantImageUrl] : sortedImages.map((i) => i.url).filter(Boolean)}
        index={variantImageUrl ? 0 : activeIndex}
        onIndexChange={(i) => { if (!variantImageUrl) setActiveIndex(i); }}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        productName={productName}
      />
    </div>
  );
}
