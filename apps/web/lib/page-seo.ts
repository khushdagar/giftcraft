import { cache } from 'react';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { normalizeSource } from '@/lib/redirects';

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

export async function withPageSeo(path: string, base: Metadata = {}): Promise<Metadata> {
  const seo = await getPageSeo(normalizeSeoPath(path));
  if (!seo) return base;

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

  return out;
}
