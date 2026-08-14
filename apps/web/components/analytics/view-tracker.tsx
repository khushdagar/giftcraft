'use client';

import { useEffect } from 'react';

/**
 * Invisible island that bumps the server-side popularity counter for the
 * product/pack/occasion being viewed. Listings order by that counter as a
 * tie-breaker under `sortOrder`.
 *
 * Counted once per browser session per entity — a refresh or a back-and-forth
 * between two products must not let one visitor inflate the ranking. The
 * request is fire-and-forget: a failed beacon is invisible to the visitor, and
 * the endpoint always answers 200.
 */
export function ViewTracker({ type, id }: { type: 'product' | 'occasion'; id: string }) {
  useEffect(() => {
    const key = `gc-viewed:${type}:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // Private mode / storage disabled — skip counting rather than double-count.
      return;
    }

    fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id }),
      keepalive: true,
    }).catch(() => {
      /* telemetry only — never surface to the visitor */
    });
  }, [type, id]);

  return null;
}
