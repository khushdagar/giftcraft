/**
 * Builds a srcset from the responsive variants that lib/image-processing.ts
 * pre-generates at upload time (…-320w.webp / …-640w.webp / …). The Next image
 * optimizer is disabled (see next.config.js), so this is how components pick a
 * right-sized file from the CDN instead of downloading the full-size primary.
 *
 * Variants smaller than the source may not exist; pair with an onError that
 * clears srcset so the primary `src` still renders (see clearSrcSetOnError).
 */
import type { SyntheticEvent } from 'react';

const VARIANT_WIDTHS = [320, 640, 1024, 1600];

export function cdnSrcSet(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  // Only our processed uploads on Spaces have variants.
  if (!/\.webp$/i.test(url) || !/digitaloceanspaces\.com/i.test(url)) return undefined;
  const base = url.slice(0, -'.webp'.length);
  return [
    ...VARIANT_WIDTHS.map((w) => `${base}-${w}w.webp ${w}w`),
    `${url} 2000w`,
  ].join(', ');
}

export function clearSrcSetOnError(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.srcset) img.srcset = '';
}
