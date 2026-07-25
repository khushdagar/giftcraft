'use client';

import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Manual control so client-side data loads (e.g. a React Query fetch that runs
 * AFTER the route has already committed, once the navigation-driven bar has
 * stopped) can keep the SAME top bar visible — instead of each page rendering
 * its own full-screen spinner. This makes the top bar the single loading
 * indicator across the whole site.
 */
let manualCount = 0;
const manualListeners = new Set<() => void>();
const emitManual = () => manualListeners.forEach((l) => l());
const manualSubscribe = (cb: () => void) => {
  manualListeners.add(cb);
  return () => {
    manualListeners.delete(cb);
  };
};
const manualSnapshot = () => manualCount;
const manualServerSnapshot = () => 0;

/** Keep the global top loading bar visible while `active` is true. */
export function useTopLoading(active: boolean) {
  useEffect(() => {
    if (!active) return;
    manualCount += 1;
    emitManual();
    return () => {
      manualCount = Math.max(0, manualCount - 1);
      emitManual();
    };
  }, [active]);
}

/**
 * Global navigation loading bar — the same indeterminate blue bar used in the
 * admin Products table, but fixed to the top of the viewport so it appears on
 * ANY client-side navigation across the site (links, router.push, back/forward).
 *
 * It starts when a navigation begins and completes once the new route commits
 * (pathname or query string changes).
 */
function TopLoadingBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manual = useSyncExternalStore(manualSubscribe, manualSnapshot, manualServerSnapshot);

  const stop = () => {
    setLoading(false);
    if (safetyTimer.current) {
      clearTimeout(safetyTimer.current);
      safetyTimer.current = null;
    }
  };

  // The committed route changed → the navigation finished.
  useEffect(() => {
    stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  useEffect(() => {
    const start = () => {
      setLoading(true);
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
      // Never let the bar hang forever if a navigation is cancelled.
      safetyTimer.current = setTimeout(() => setLoading(false), 10_000);
    };

    // Immediate feedback on link clicks, before Next.js commits the route.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || anchor.getAttribute('target') === '_blank' || anchor.hasAttribute('download')) {
        return;
      }
      try {
        const url = new URL(href, window.location.href);
        // Same URL → no navigation happens, so don't flash the bar.
        if (
          url.origin === window.location.origin &&
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return;
        }
      } catch {
        return;
      }
      start();
    };

    // Programmatic navigations (router.push / router.replace go through pushState).
    const originalPushState = window.history.pushState;
    window.history.pushState = function patchedPushState(...args) {
      start();
      return originalPushState.apply(this, args as Parameters<typeof originalPushState>);
    };

    window.addEventListener('popstate', start);
    document.addEventListener('click', onClick, true);

    return () => {
      window.history.pushState = originalPushState;
      window.removeEventListener('popstate', start);
      document.removeEventListener('click', onClick, true);
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
    };
  }, []);

  if (!loading && manual === 0) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[9999] h-0.5 w-full overflow-hidden bg-transparent pointer-events-none">
      <style>{`@keyframes gc-indeterminate{0%{left:-40%;width:40%}50%{width:55%}100%{left:100%;width:40%}}`}</style>
      <div
        className="absolute top-0 h-full rounded-full bg-[#135A42]"
        style={{ animation: 'gc-indeterminate 1.1s ease-in-out infinite' }}
      />
    </div>
  );
}

export function TopLoadingBar() {
  // useSearchParams() must live inside a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <TopLoadingBarInner />
    </Suspense>
  );
}
