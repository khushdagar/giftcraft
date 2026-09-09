import { cache } from 'react';
import type { Metadata } from 'next';

// Next doesn't export its OGImage type; unwrap it from Metadata. Distributive
// over the `OGImage | OGImage[]` union, so this yields the single-item type.
type Unwrap<T> = T extends Array<infer U> ? U : T;
type OGImage = Unwrap<NonNullable<NonNullable<Metadata['openGraph']>['images']>>;
import { prisma } from '@/lib/prisma';
import { normalizeSource } from '@/lib/redirects';
import { SITE_URL } from '@/lib/site';

/**
 * Per-page SEO overrides, managed from /admin/seo (PageSeo table).
 *
 * Pages keep generating their own metadata exactly as before; withPageSeo()
 * only overlays the fields the SEO team has explicitly filled in for that
 * path. No row (or a database hiccup) means the page's own metadata is
 * returned untouched — rendering must never break because of this table.
 */

/** Same normalisation the redirects feature uses, minus its "/*" wildcard. */
export function normalizeSeoPath(input: string): string {
  const value = normalizeSource(input);
  return value.endsWith('/*') ? value.slice(0, -2) || '/' : value;
}

const getPageSeo = cache(async (path: string) => {
  try {
    return await prisma.pageSeo.findUnique({ where: { path } });
  } catch {
    return null;
  }
});

/** Site-wide link-preview card, rendered by app/opengraph-image.tsx. */
export const DEFAULT_OG_IMAGE = '/opengraph-image';

/**
 * Uploads are WebP, which WhatsApp / LinkedIn / Google Chat refuse as an
 * og:image. Route every CDN image through /og/share.jpg, which serves a
 * 1200×630 JPEG rendition. Relative paths (the site card) and foreign hosts
 * are left untouched.
 */
export function shareImageUrl(src: string): string {
  try {
    const url = new URL(src, SITE_URL);
    const own = url.hostname === 'cdn.givoo.in' || url.hostname.endsWith('.digitaloceanspaces.com');
    if (!own) return src;
    return `${SITE_URL}/og/share.jpg?src=${encodeURIComponent(url.toString())}`;
  } catch {
    return src;
  }
}

function rewriteOgImage(item: OGImage): OGImage {
  if (typeof item === 'string') return shareImageUrl(item);
  if (item instanceof URL) return shareImageUrl(item.toString());
  const url = shareImageUrl(item.url.toString());
  return url === item.url ? item : { ...item, url, type: 'image/jpeg', width: 1200, height: 630 };
}

function rewriteOgImages(images: OGImage | OGImage[]): OGImage[] {
  return (Array.isArray(images) ? images : [images]).map(rewriteOgImage);
}

/**
 * Next merges metadata shallowly: a page that sets its own `openGraph` object
 * replaces the root one entirely, and the file-based opengraph-image is NOT
 * re-attached. Every such page therefore shared to WhatsApp/LinkedIn with no
 * picture. Fill in the default card wherever a page hasn't chosen an image,
 * and rewrite chosen CDN images to the JPEG share rendition.
 */
function withDefaultOgImage(meta: Metadata): Metadata {
  const out: Metadata = { ...meta };
  if (out.openGraph) {
    out.openGraph = {
      ...out.openGraph,
      images: out.openGraph.images
        ? rewriteOgImages(out.openGraph.images)
        : [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, type: 'image/png' }],
    };
  }
  if (out.twitter) {
    out.twitter = {
      ...out.twitter,
      images: out.twitter.images ? rewriteOgImages(out.twitter.images) : [DEFAULT_OG_IMAGE],
    };
  }
  return out;
}

export async function withPageSeo(path: string, base: Metadata = {}): Promise<Metadata> {
  const seo = await getPageSeo(normalizeSeoPath(path));
  if (!seo) return withDefaultOgImage(base);

  const out: Metadata = { ...base };

  const title = seo.metaTitle?.trim() || undefined;
  const description = seo.metaDescription?.trim() || undefined;

  // `absolute` skips the root layout's "· GIVOO" template — the SEO team's
  // title is used exactly as entered.
  if (title) out.title = { absolute: title };
  if (description) out.description = description;
  if (seo.canonicalUrl) {
    out.alternates = { ...(base.alternates ?? {}), canonical: seo.canonicalUrl };
  }

  const ogTitle = seo.ogTitle?.trim() || title;
  const ogDescription = seo.ogDescription?.trim() || description;
  const ogImage = seo.ogImageUrl?.trim() || undefined;
  if (ogTitle || ogDescription || ogImage) {
    out.openGraph = {
      ...(base.openGraph ?? {}),
      ...(ogTitle ? { title: ogTitle } : {}),
      ...(ogDescription ? { description: ogDescription } : {}),
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    };
    // Keep the Twitter card in step so it never shows a stale title/image.
    out.twitter = {
      ...(base.twitter ?? {}),
      ...(ogTitle ? { title: ogTitle } : {}),
      ...(ogDescription ? { description: ogDescription } : {}),
      ...(ogImage ? { images: [ogImage] } : {}),
    };
  }

  if (seo.noIndex !== null || seo.noFollow !== null) {
    const baseRobots = base.robots && typeof base.robots === 'object' ? base.robots : {};
    out.robots = {
      ...baseRobots,
      ...(seo.noIndex !== null ? { index: !seo.noIndex } : {}),
      ...(seo.noFollow !== null ? { follow: !seo.noFollow } : {}),
    };
  }

  return withDefaultOgImage(out);
}
