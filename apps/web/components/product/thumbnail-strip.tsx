'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';

// Thumbnail rail: a horizontal strip under the main image on mobile, a vertical
// column beside it at lg+. In both orientations the rail is capped to the main
// image and scrolls within that box — at lg+ it's absolutely positioned inside a
// stretched flex column, so its height tracks the main image exactly without
// measuring anything. Arrows only appear while the rail is actually overflowing,
// and each one hides once that end is reached.
export function ThumbnailStrip({ children }: { children: ReactNode }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);
  // Which axis the rail scrolls on — mirrors the lg: breakpoint below.
  const [vertical, setVertical] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setVertical(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const sync = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const pos = vertical ? el.scrollTop : el.scrollLeft;
    const max = vertical
      ? el.scrollHeight - el.clientHeight
      : el.scrollWidth - el.clientWidth;
    setAtStart(pos <= 1);
    // 1px slack absorbs sub-pixel rounding at the far end.
    setAtEnd(pos >= max - 1);
  }, [vertical]);

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
    if (vertical) el.scrollBy({ top: dir * el.clientHeight * 0.8, behavior: 'smooth' });
    else el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  const arrow =
    'absolute z-10 flex items-center justify-center rounded-full bg-[#800020] p-1 shadow-md backdrop-blur transition hover:bg-[#66001a]';
  // Mobile: centred on the left/right edges. lg+: centred on the top/bottom edges.
  const across = vertical ? 'left-1/2 -translate-x-1/2' : 'top-1/2 -translate-y-1/2';

  return (
    <div className="relative lg:w-16 lg:self-stretch">
      <div
        ref={railRef}
        onScroll={sync}
        className="no-scrollbar flex snap-x snap-mandatory flex-row gap-2 overflow-x-auto lg:absolute lg:inset-0 lg:snap-y lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto"
      >
        {children}
      </div>

      {!atStart && (
        <button
          type="button"
          onClick={() => nudge(-1)}
          aria-label="Previous thumbnails"
          className={`${arrow} ${across} ${vertical ? 'top-1' : 'left-1'}`}
        >
          {vertical ? (
            <ChevronUp className="h-5 w-5 text-white" />
          ) : (
            <ChevronLeft className="h-6 w-6 text-white" />
          )}
        </button>
      )}
      {!atEnd && (
        <button
          type="button"
          onClick={() => nudge(1)}
          aria-label="More thumbnails"
          className={`${arrow} ${across} ${vertical ? 'bottom-1' : 'right-1'}`}
        >
          {vertical ? (
            <ChevronDown className="h-5 w-5 text-white" />
          ) : (
            <ChevronRight className="h-6 w-6 text-white" />
          )}
        </button>
      )}
    </div>
  );
}
