'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type PriceRange = { min: number | null; max: number | null };

const PREFIX = 'givoo:price-range:';

function toNum(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * A price-range filter that survives navigation.
 *
 * The band the visitor picked is kept in sessionStorage under `key`, so leaving
 * a listing page for a product and coming back — or moving between listing
 * pages that share the key — restores it instead of snapping back to the full
 * range. It stays until the visitor changes or clears it (or closes the tab).
 *
 * Only a range the visitor actually set is stored. Bounds applied
 * programmatically when the product set changes never overwrite it; they only
 * clamp it, so a band left over from a wider catalogue can't hide everything on
 * a narrower one.
 */
export function usePersistedPriceRange(
  key: string,
  initial: PriceRange = { min: null, max: null }
) {
  const [range, setRange] = useState<PriceRange>(initial);
  const touched = useRef(false);
  const storageKey = PREFIX + key;

  // Restored after hydration — reading sessionStorage during render would make
  // the server and client markup disagree.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      const min = toNum(saved?.min);
      const max = toNum(saved?.max);
      if (min === null && max === null) return;
      touched.current = true;
      setRange({ min, max });
    } catch {
      // Storage disabled (private mode) — the filter simply doesn't persist.
    }
  }, [storageKey]);

  const store = useCallback(
    (next: PriceRange | null) => {
      try {
        if (next) window.sessionStorage.setItem(storageKey, JSON.stringify(next));
        else window.sessionStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    },
    [storageKey]
  );

  /** The visitor moved a slider or typed a value — this is what gets remembered. */
  const setUserRange = useCallback(
    (next: PriceRange) => {
      touched.current = true;
      store(next);
      setRange(next);
    },
    [store]
  );

  /**
   * The product set (and therefore the slider's bounds) changed. Untouched →
   * take `fallback`; touched → keep the visitor's band, clamped into the new
   * bounds.
   */
  const applyBounds = useCallback(
    (min: number | null, max: number | null, fallback: PriceRange) => {
      setRange((prev) => {
        if (!touched.current) {
          return prev.min === fallback.min && prev.max === fallback.max ? prev : fallback;
        }
        const lo = min ?? -Infinity;
        const hi = max ?? Infinity;
        // No overlap at all (e.g. a ₹2–3k band carried onto a ₹500–1k listing)
        // — clamping would leave a hairline range matching nothing, so fall
        // back to the full range for this page instead.
        if ((prev.min !== null && prev.min > hi) || (prev.max !== null && prev.max < lo)) {
          return prev.min === fallback.min && prev.max === fallback.max ? prev : fallback;
        }
        const clamp = (v: number | null) => (v === null ? null : Math.min(Math.max(v, lo), hi));
        const next = { min: clamp(prev.min), max: clamp(prev.max) };
        return next.min === prev.min && next.max === prev.max ? prev : next;
      });
    },
    []
  );

  /** "Clear filters" — forget the stored band too, not just this page's copy. */
  const reset = useCallback(
    (fallback: PriceRange = { min: null, max: null }) => {
      touched.current = false;
      store(null);
      setRange(fallback);
    },
    [store]
  );

  return { range, setUserRange, applyBounds, reset };
}
