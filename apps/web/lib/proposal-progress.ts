'use client';

import { useEffect, useState } from 'react';

/**
 * Shared client-side pieces for every "get the proposal" surface (checkout,
 * order pages, enquiries preview, the admin proposal builder): prepare the AI
 * pack image first, and tell the user what is happening when it runs long.
 */

/** Shown as soon as the AI pack image starts generating. */
export const PACK_IMAGE_WORKING_MESSAGE =
  'Creating your pack visual with AI — this usually takes 20–40 seconds.';
/** Replaces it once the wait is clearly longer than usual. */
export const PACK_IMAGE_SLOW_MESSAGE =
  'Still working — AI image generation is taking longer than usual. Please keep this tab open; your proposal will be ready shortly.';
/** How long before the "taking longer" wording takes over. */
export const PACK_IMAGE_SLOW_AFTER_MS = 25_000;

/**
 * Ask the server to make sure the quote/order has its AI pack image. Resolves
 * when it is ready (instant when it already exists). Never throws — if the
 * image cannot be produced the proposal is still built, just without it.
 */
export async function preparePackImage(target: { quoteToken?: string; orderId?: string }): Promise<void> {
  const url = target.orderId
    ? `/api/orders/${target.orderId}/pack-image`
    : target.quoteToken
      ? `/api/quotes/${target.quoteToken}/pack-image`
      : null;
  if (!url) return;
  try {
    await fetch(url, { method: 'POST' });
  } catch {
    /* non-fatal: the deck renders without the pack photo */
  }
}

/** True once `active` has been continuously true for `afterMs`. */
export function useSlowNotice(active: boolean, afterMs: number = PACK_IMAGE_SLOW_AFTER_MS): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), afterMs);
    return () => clearTimeout(timer);
  }, [active, afterMs]);
  return slow;
}
