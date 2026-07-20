'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Horizontal thumbnail rail used under the main product image on mobile, which
// becomes a plain vertical column at lg+. Arrows only appear while the rail is
// actually overflowing, and each one hides once that end is reached.
export function ThumbnailStrip({ children }: { children: ReactNode }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const sync = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 1);
    // 1px slack absorbs sub-pixel rounding at the far end.
    setAtEnd(el.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sync, children]);

  const nudge = (dir: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  const arrow = 'absolute top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full bg-[#1a6b4f] p-1 shadow-md backdrop-blur transition hover:bg-white lg:hidden';

  return (
    <div className="relative">
      <div
        ref={railRef}
        onScroll={sync}
        className="no-scrollbar flex snap-x snap-mandatory flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-x-visible"
      >
        {children}
      </div>

      {!atStart && (
        <button
          type="button"
          onClick={() => nudge(-1)}
          aria-label="Previous thumbnails"
          className={`${arrow} left-1`}
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
      )}
      {!atEnd && (
        <button
          type="button"
          onClick={() => nudge(1)}
          aria-label="More thumbnails"
          className={`${arrow} right-1`}
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>
      )}
    </div>
  );
}
