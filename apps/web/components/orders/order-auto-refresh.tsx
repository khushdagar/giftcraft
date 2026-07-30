'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Statuses where the order can advance without the viewer doing anything —
// after handoff the delivery partner (Shiprocket webhooks) drives the status,
// so while one of these is active we silently re-fetch the page on an interval
// to keep the timeline current without a manual reload.
const LIVE_STATUSES = ['packed', 'shipped', 'in_transit'];

export function OrderAutoRefresh({
  status,
  intervalMs = 30000,
}: {
  status: string;
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!LIVE_STATUSES.includes(status)) return;
    const id = setInterval(() => {
      // Skip refreshes while the tab is in the background — the page catches
      // up on the next tick after the user returns.
      if (document.visibilityState === 'visible') router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [status, intervalMs, router]);

  return null;
}
