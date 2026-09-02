import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/site';
import { urlsetXml, sitemapResponse, type Changefreq } from '@/lib/sitemap-xml';

export const dynamic = 'force-dynamic';

// Static and hub pages. Content types with their own child sitemap (packs,
// categories, occasions, products, blog) are NOT repeated here.
const STATIC_PAGES: Array<{ path: string; changefreq: Changefreq; priority: number }> = [
  { path: '/', changefreq: 'daily', priority: 1 },
  { path: '/catalog', changefreq: 'daily', priority: 0.9 },
  { path: '/builder', changefreq: 'weekly', priority: 0.9 },
  { path: '/contact', changefreq: 'monthly', priority: 0.5 },
  { path: '/sell-with-us', changefreq: 'monthly', priority: 0.4 },
  { path: '/faq', changefreq: 'monthly', priority: 0.4 },
  { path: '/shipping', changefreq: 'monthly', priority: 0.4 },
  { path: '/returns', changefreq: 'monthly', priority: 0.4 },
  { path: '/terms', changefreq: 'yearly', priority: 0.3 },
  { path: '/privacy', changefreq: 'yearly', priority: 0.3 },
  { path: '/gst', changefreq: 'yearly', priority: 0.3 },
];

export async function GET() {
  // Static pages have no row-level content stamp, but an admin edit in
  // /admin/seo (PageSeo) is a real modification — use it where one exists and
  // omit lastmod otherwise, rather than faking a build timestamp.
  let seoByPath = new Map<string, Date>();
  try {
    const rows = await prisma.pageSeo.findMany({
      where: { path: { in: STATIC_PAGES.map((p) => p.path) } },
      select: { path: true, updatedAt: true },
    });
    seoByPath = new Map(rows.map((r) => [r.path, r.updatedAt]));
  } catch (error) {
    console.error('sitemap-pages: PageSeo lookup failed', error);
  }

  return sitemapResponse(
    urlsetXml(
      STATIC_PAGES.map((p) => ({
        url: p.path === '/' ? SITE_URL : `${SITE_URL}${p.path}`,
        lastmod: seoByPath.get(p.path) ?? null,
        changefreq: p.changefreq,
        priority: p.priority,
      }))
    )
  );
}
