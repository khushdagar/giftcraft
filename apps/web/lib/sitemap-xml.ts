// Shared serialisation for the Yoast-style sitemap index + child sitemaps.
// Next 14's MetadataRoute.Sitemap can't emit a <sitemapindex>, so the sitemap
// routes are plain route handlers that build the XML themselves.

export type Changefreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

export interface SitemapEntry {
  url: string;
  /** Real content-modification timestamp. Omit rather than fake one — a
   *  missing lastmod is a weaker signal than a wrong one. */
  lastmod?: Date | null;
  changefreq?: Changefreq;
  priority?: number;
}

export interface SitemapChildRef {
  loc: string;
  lastmod?: Date | null;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const HEADER = '<?xml version="1.0" encoding="UTF-8"?>';
const NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';

export function urlsetXml(entries: SitemapEntry[]): string {
  const body = entries
    .map((e) => {
      const parts = [`<loc>${xmlEscape(e.url)}</loc>`];
      if (e.lastmod) parts.push(`<lastmod>${e.lastmod.toISOString()}</lastmod>`);
      if (e.changefreq) parts.push(`<changefreq>${e.changefreq}</changefreq>`);
      if (e.priority !== undefined) parts.push(`<priority>${e.priority}</priority>`);
      return `<url>${parts.join('')}</url>`;
    })
    .join('\n');
  return `${HEADER}\n<urlset xmlns="${NS}">\n${body}\n</urlset>`;
}

export function sitemapIndexXml(children: SitemapChildRef[]): string {
  const body = children
    .map((c) => {
      const parts = [`<loc>${xmlEscape(c.loc)}</loc>`];
      if (c.lastmod) parts.push(`<lastmod>${c.lastmod.toISOString()}</lastmod>`);
      return `<sitemap>${parts.join('')}</sitemap>`;
    })
    .join('\n');
  return `${HEADER}\n<sitemapindex xmlns="${NS}">\n${body}\n</sitemapindex>`;
}

export function sitemapResponse(xml: string): Response {
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}

/** Newest of a set of optional dates, or null when none exist. */
export function latest(dates: Array<Date | null | undefined>): Date | null {
  let max: Date | null = null;
  for (const d of dates) {
    if (d && (!max || d > max)) max = d;
  }
  return max;
}
