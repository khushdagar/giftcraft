/**
 * Single source of truth for the site's canonical origin + brand name.
 * Every SEO surface (metadata, robots, sitemap, JSON-LD, OG) must use these —
 * never hardcode a host anywhere else.
 *
 * NEXT_PUBLIC_APP_URL must be set to the production https origin in prod
 * (e.g. https://giftcraft.in). The fallback keeps robots/sitemap/OG coherent
 * even if the env var is missing.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://giftcraft.in').replace(
  /\/$/,
  ''
);

export const SITE_NAME = 'GIVOO';

export const SITE_TAGLINE = "India's First Self-Serve Bulk Corporate Gifting Platform";

export const SITE_DESCRIPTION =
  'Browse products, build branded gift packs, and get instant transparent pricing. Bulk corporate gifting by GIVOO, Delhi.';

/** Resolve a possibly-relative path/URL to an absolute URL on the canonical host. */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}
