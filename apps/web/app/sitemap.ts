import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { publishedPostWhere } from '@/lib/blog';
import { getHiddenCategoryIds } from '@/lib/catalog-visibility';
import { getCategoryNav } from '@/lib/category-data';
import { SITE_URL } from '@/lib/site';

// Rendered at request time, never at build: build-time prerendering runs
// hundreds of pages in parallel and can exhaust the Postgres connection pool,
// which would bake an empty (static-routes-only) sitemap into the ISR cache
// for an hour. The query is cheap and crawlers fetch the sitemap rarely.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/catalog`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/categories`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/builder`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/packs`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/sell-with-us`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/shipping`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/returns`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/gst`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  try {
    const hiddenCategoryIds = await getHiddenCategoryIds();

    const [categories, products, collections, posts] = await Promise.all([
      // Category landing pages — only those with live products (getCategoryNav
      // already drops empty ones, which are noindex and must not be submitted).
      getCategoryNav(),
      // Every live product + curated pack gets a sitemap entry — this is
      // Google's main discovery path for PDPs. (Product images reach Google
      // via og:image + Product JSON-LD on the PDP itself; Next 14.2's sitemap
      // serializer has no image-sitemap support.)
      prisma.product.findMany({
        where: {
          status: 'active',
          ...(hiddenCategoryIds.length > 0
            ? { categories: { none: { categoryId: { in: hiddenCategoryIds } } } }
            : {}),
        },
        select: { slug: true, updatedAt: true },
      }),
      prisma.giftCollection.findMany({
        where: { isActive: true, packProducts: { some: { isPack: true, status: 'active' } } },
        select: { slug: true, updatedAt: true },
      }),
      // Posts marked noIndex are deliberately kept out of search — so keep them
      // out of the sitemap too.
      prisma.blogPost.findMany({
        where: { ...publishedPostWhere(), noIndex: false },
        select: { slug: true, updatedAt: true },
        orderBy: { publishedAt: 'desc' },
      }),
    ]);

    return [
      ...staticRoutes,
      ...categories.map((c) => ({
        url: `${SITE_URL}/categories/${c.slug}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
      ...products.map((p) => ({
        url: `${SITE_URL}/products/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
      ...collections.map((c) => ({
        url: `${SITE_URL}/packs/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
      ...posts.map((post) => ({
        url: `${SITE_URL}/blog/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
    ];
  } catch (error) {
    // A database hiccup shouldn't take the whole sitemap down — but log it,
    // because a sitemap silently missing every product is an SEO incident.
    console.error('sitemap: dynamic URL generation failed', error);
    return staticRoutes;
  }
}
