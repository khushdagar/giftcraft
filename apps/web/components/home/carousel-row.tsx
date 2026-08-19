'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Horizontal card row shared by the homepage "Trending" sections: a snap-free
 * scroller with prev/next arrows and an optional auto-advance that parks itself
 * whenever the visitor touches the row.
 *
 * Children are the cards themselves — the row only owns the scrolling.
 */
export function CarouselRow({
  children,
  autoScroll = false,
  gapPx = 24,
  ariaLabel,
}: {
  children: React.ReactNode;
  /** Advance one card every few seconds, looping at the end. */
  autoScroll?: boolean;
  /** Gap between cards at the current breakpoint — the arrow step size. */
  gapPx?: number;
  ariaLabel?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  // Arrows only appear once the row actually overflows, and each greys out at
  // its end of the track.
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const syncArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    syncArrows();
    el.addEventListener('scroll', syncArrows, { passive: true });
    window.addEventListener('resize', syncArrows);
    return () => {
      el.removeEventListener('scroll', syncArrows);
      window.removeEventListener('resize', syncArrows);
    };
  }, [syncArrows, children]);

  // One card + gap, measured from the DOM so a click always lands the row on a
  // card edge whatever width the cards currently are.
  const stepPx = () => {
    const el = scrollRef.current;
    if (!el) return 0;
    const card = el.firstElementChild?.firstElementChild as HTMLElement | undefined;
    return card ? card.offsetWidth + gapPx : el.clientWidth * 0.8;
  };

  const scrollByCard = (dir: 'prev' | 'next') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'next' ? stepPx() : -stepPx(), behavior: 'smooth' });
  };

  // Auto-advance. Pauses on hover, and any manual scroll/swipe/wheel parks it
  // so the row never yanks itself out from under a finger that's still moving.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !autoScroll || reduceMotion) return;

    let hovered = false;
    const IDLE_MS = 6000;
    let pausedUntil = 0;
    // Our own scrollBy/scrollTo also fire `scroll`; ignore those so a
    // programmatic step doesn't read as user input and pause the timer forever.
    let autoUntil = 0;

    const hold = () => { pausedUntil = Date.now() + IDLE_MS; };
    const onScroll = () => { if (Date.now() > autoUntil) hold(); };
    const onEnter = () => { hovered = true; };
    const onLeave = () => { hovered = false; };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('touchstart', hold, { passive: true });
    el.addEventListener('touchmove', hold, { passive: true });
    el.addEventListener('wheel', hold, { passive: true });
    el.addEventListener('pointerdown', hold);
    el.addEventListener('scroll', onScroll, { passive: true });

    const timer = setInterval(() => {
      if (hovered || Date.now() < pausedUntil) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      // Smooth scrolling keeps firing `scroll` events after the call returns —
      // stay in "auto" mode long enough to cover the whole animation.
      autoUntil = Date.now() + 1200;
      if (scrollLeft + clientWidth >= scrollWidth - 8) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: stepPx(), behavior: 'smooth' });
      }
    }, 3000);

    return () => {
      clearInterval(timer);
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('touchstart', hold);
      el.removeEventListener('touchmove', hold);
      el.removeEventListener('wheel', hold);
      el.removeEventListener('pointerdown', hold);
      el.removeEventListener('scroll', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScroll, reduceMotion, children]);

  const arrowClass =
    'absolute top-[38%] z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-[#E5DFD4] transition hover:bg-[#F5F1EB] active:scale-95 sm:flex';

  return (
    <div className="relative">
      <div ref={scrollRef} className="overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex gap-3 pb-4 min-w-min sm:gap-6">{children}</div>
      </div>

      {canPrev && (
        <button
          type="button"
          onClick={() => scrollByCard('prev')}
          aria-label={ariaLabel ? `Previous ${ariaLabel}` : 'Previous'}
          className={`${arrowClass} -left-4`}
        >
          <ChevronLeft className="h-5 w-5 text-[#800020]" />
        </button>
      )}
      {canNext && (
        <button
          type="button"
          onClick={() => scrollByCard('next')}
          aria-label={ariaLabel ? `Next ${ariaLabel}` : 'Next'}
          className={`${arrowClass} -right-4`}
        >
          <ChevronRight className="h-5 w-5 text-[#800020]" />
        </button>
      )}
    </div>
  );
}
