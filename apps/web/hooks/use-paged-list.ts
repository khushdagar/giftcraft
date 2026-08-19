'use client';

import { useCallback, useRef, useState } from 'react';

/** Cards rendered on first paint, and added by each press of "Load more". */
export const DEFAULT_PAGE_SIZE = 48;

/**
 * Caps a client-side list to a growing window, so a 200-card grid doesn't mount
 * (and pull images for) every item on first paint. The window grows only when
 * the user presses "Load more" — deliberately not on scroll, so reaching the
 * footer stays possible and the user controls when more work happens.
 *
 * `resetKey` is a value-based signature of the caller's filter/search/sort
 * state. The window resets when it changes. It deliberately does NOT key off
 * the `items` array identity: a memo upstream can hand back a fresh array on an
 * unrelated re-render, which would silently snap the window back to page one
 * and make "Load more" look like a no-op.
 */
export function usePagedList<T>(
  items: T[],
  resetKey: string = '',
  pageSize: number = DEFAULT_PAGE_SIZE
) {
  const [count, setCount] = useState(pageSize);

  // Not an effect: resetting during render avoids painting one frame of the
  // old (too-long) window after a filter change.
  const lastKey = useRef(resetKey);
  if (lastKey.current !== resetKey) {
    lastKey.current = resetKey;
    if (count !== pageSize) setCount(pageSize);
  }

  const loadMore = useCallback(() => setCount((c) => c + pageSize), [pageSize]);

  return {
    visible: items.slice(0, count),
    shown: Math.min(count, items.length),
    remaining: Math.max(0, items.length - count),
    hasMore: count < items.length,
    loadMore,
  };
}
