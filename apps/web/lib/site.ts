/**
 * Single source of truth for the site's canonical origin + brand name.
 * Every SEO surface (metadata, robots, sitemap, JSON-LD, OG) must use these —
 * never hardcode a host anywhere else.
 *
 * NEXT_PUBLIC_APP_URL must be set to the production https origin in prod
 * (e.g. https://givoo.in). The fallback keeps robots/sitemap/OG coherent
 * even if the env var is missing.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://givoo.in').replace(
  /\/$/,
  ''
);

/**
 * Site-wide noindex kill switch. Set SITE_NOINDEX="true" in the environment to
 * keep the whole site out of search results (pre-launch, staging, a soft
 * relaunch). Any other value — or unset — leaves the site indexable.
 *
 * This emits `<meta name="robots" content="noindex, nofollow">` on every page
 * AND keeps robots.txt crawlable on purpose: a `Disallow: /` would stop Google
 * fetching the pages at all, so it would never SEE the noindex, and URLs already
 * known to it could linger in the index indefinitely. Allow the crawl, tell it
 * not to index — that's what actually removes pages.
 */
export const SITE_NOINDEX = process.env.SITE_NOINDEX === 'true';

export const SITE_NAME = 'GIVOO';

export const SITE_TAGLINE = "India's First Self-Serve Bulk Corporate Gifting Platform";

export const SITE_DESCRIPTION =
  'Browse products, build branded gift packs, and get instant transparent pricing. Bulk corporate gifting by GIVOO, Delhi.';

/** Resolve a possibly-relative path/URL to an absolute URL on the canonical host. */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

/**
 * Page-level openGraph with og:url matching the page's canonical path.
 *
 * A page that defines `openGraph` replaces the root layout's object WHOLESALE
 * (Next merges metadata shallowly, nested objects are not deep-merged) — a page
 * that omits it inherits the root's og:url, which points at the homepage. So
 * any page with its own canonical must build its openGraph through this helper
 * to get the right og:url without losing siteName/type/locale.
 */
export function pageOpenGraph(canonicalPath: string, title: string, description: string) {
  return {
    type: 'website' as const,
    siteName: SITE_NAME,
    locale: 'en_IN',
    url: absoluteUrl(canonicalPath),
    title,
    description,
  };
}
