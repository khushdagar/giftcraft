import { prisma } from '@/lib/prisma';
import { publishedPostWhere } from '@/lib/blog';
import { SITE_URL } from '@/lib/site';
import { sitemapIndexXml, sitemapResponse, type SitemapChildRef } from '@/lib/sitemap-xml';

// Yoast-style sitemap index: /sitemap.xml only points at the child sitemaps,
// each of which owns one content type. Rendered at request time, never at
// build — same reasoning as the old flat sitemap: build-time prerendering can
// exhaust the Postgres pool and bake an empty file into the ISR cache.
export const dynamic = 'force-dynamic';

export async function GET() {
  // Each child's <lastmod> is the newest content stamp inside it — cheap
  // aggregates, so the index itself stays a lightweight request.
  let pagesMax: Date | null = null;
  let productMax: Date | null = null;
  let packMax: Date | null = null;
  let blogMax: Date | null = null;

  try {
    const [pageSeo, product, pack, blog] = await Promise.all([
      prisma.pageSeo.aggregate({ _max: { updatedAt: true } }),
      prisma.product.aggregate({
        where: { status: 'active', isPack: false },
        _max: { updatedAt: true },
      }),
      prisma.product.aggregate({
        where: { status: 'active', isPack: true },
        _max: { updatedAt: true },
      }),
      prisma.blogPost.aggregate({
        where: { ...publishedPostWhere(), noIndex: false },
        _max: { updatedAt: true },
      }),
    ]);
    pagesMax = pageSeo._max.updatedAt;
    productMax = product._max.updatedAt;
    packMax = pack._max.updatedAt;
    blogMax = blog._max.updatedAt;
  } catch (error) {
    // The index must never 500 over a DB hiccup — serve it without lastmod.
    console.error('sitemap index: lastmod aggregation failed', error);
  }

  const children: SitemapChildRef[] = [
    { loc: `${SITE_URL}/sitemap-pages.xml`, lastmod: pagesMax },
    { loc: `${SITE_URL}/sitemap-packs.xml`, lastmod: packMax },
    // Category and occasion listings change when their products do.
    { loc: `${SITE_URL}/sitemap-categories.xml`, lastmod: productMax },
    { loc: `${SITE_URL}/sitemap-occasions.xml`, lastmod: productMax },
    { loc: `${SITE_URL}/sitemap-products.xml`, lastmod: productMax },
    { loc: `${SITE_URL}/sitemap-blog.xml`, lastmod: blogMax },
  ];

  return sitemapResponse(sitemapIndexXml(children));
}
