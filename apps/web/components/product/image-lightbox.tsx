'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ImageLightboxProps {
  images: string[];
  index: number;
  onIndexChange: (index: number) => void;
  open: boolean;
  onClose: () => void;
  productName: string;
}

// Full-screen image viewer. Opening it IS the zoom — the image simply fills the
// screen. Swipe or use the edge arrows to move between images; the cross closes.
export function ImageLightbox({
  images,
  index,
  onIndexChange,
  open,
  onClose,
  productName,
}: ImageLightboxProps) {
  const reduceMotion = useReducedMotion();

  // Portalled to <body> so no ancestor stacking context can trap the overlay.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    // Stop the page behind the overlay from scrolling under the viewer.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && index < images.length - 1) onIndexChange(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1);
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, onIndexChange, index, images.length]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (Math.abs(info.offset.x) < 60) return;
    const next = index + (info.offset.x < 0 ? 1 : -1);
    if (next >= 0 && next < images.length) onIndexChange(next);
  };

  const url = images[index];

  const edgeArrow =
    'absolute top-1/2 z-10 flex h-11 w-7 -translate-y-1/2 items-center justify-center border border-bdr bg-white/90 shadow-md transition hover:bg-white';

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && url && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          // Above the navbar (700), WhatsApp widget (600) and mobile drawer (800).
          className="fixed inset-0 z-[900] flex flex-col bg-white lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} images`}
        >
          {/* Close — pinned top-left above everything else. */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close image viewer"
            className="absolute left-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-bdr bg-white text-ink shadow-md transition hover:bg-elevated"
            style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Stage */}
          <div
            onClick={onClose}
            className="flex flex-1 items-center justify-center overflow-hidden"
            style={{ paddingTop: 'calc(4rem + env(safe-area-inset-top))' }}
          >
            <motion.div
              key={index}
              drag={images.length > 1 ? 'x' : false}
              dragElastic={0.2}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleDragEnd}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.15 }}
              className="flex h-full w-full items-center justify-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={productName}
                // Taps on the image itself must not reach the backdrop, which closes.
                onClick={(e) => e.stopPropagation()}
                draggable={false}
                className="max-h-full w-full object-contain"
              />
            </motion.div>
          </div>

          {/* Edge arrows — each hides at its end of the list. */}
          {images.length > 1 && index > 0 && (
            <button
              type="button"
              onClick={() => onIndexChange(index - 1)}
              aria-label="Previous image"
              className={edgeArrow + ' left-0 rounded-r-md'}
            >
              <ChevronLeft className="h-5 w-5 text-ink" />
            </button>
          )}
          {images.length > 1 && index < images.length - 1 && (
            <button
              type="button"
              onClick={() => onIndexChange(index + 1)}
              aria-label="Next image"
              className={edgeArrow + ' right-0 rounded-l-md'}
            >
              <ChevronRight className="h-5 w-5 text-ink" />
            </button>
          )}

          {/* Position dots */}
          {images.length > 1 && (
            <div
              className="flex justify-center gap-1.5 pt-4"
              style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
            >
              {images.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => onIndexChange(i)}
                  aria-label={`Go to image ${i + 1}`}
                  aria-current={i === index}
                  className={`h-1.5 w-1.5 rounded-full transition ${
                    i === index ? 'bg-ink' : 'bg-ink/25'
                  }`}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
