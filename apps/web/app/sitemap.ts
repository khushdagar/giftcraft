import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { publishedPostWhere, POSTS_PER_PAGE } from '@/lib/blog';
import { getHiddenCategoryIds } from '@/lib/catalog-visibility';
import { getCategoryNav } from '@/lib/category-data';
import { getOccasionSlugs } from '@/lib/occasion-data';
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
    { url: `${SITE_URL}/occasions`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/builder`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/curated-packs`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
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

    const [categories, occasions, products, collections, posts, blogCategories] = await Promise.all([
      // Category landing pages — only those with live products (getCategoryNav
      // already drops empty ones, which are noindex and must not be submitted).
      getCategoryNav(),
      // Occasion + curated-collection landing pages, both live at /occasion/*.
      getOccasionSlugs(),
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
      // Both levels of the tree. A sub-collection's canonical URL nests under
      // its parent, so the parent slug comes along for the path.
      prisma.giftCollection.findMany({
        where: {
          isActive: true,
          OR: [
            { packProducts: { some: { isPack: true, status: 'active' } } },
            {
              children: {
                some: {
                  isActive: true,
                  packProducts: { some: { isPack: true, status: 'active' } },
                },
              },
            },
          ],
        },
        select: {
          slug: true,
          updatedAt: true,
          parent: { select: { slug: true, isActive: true } },
        },
      }),
      // Posts marked noIndex are deliberately kept out of search — so keep them
      // out of the sitemap too.
      prisma.blogPost.findMany({
        where: { ...publishedPostWhere(), noIndex: false },
        select: { slug: true, updatedAt: true },
        orderBy: { publishedAt: 'desc' },
      }),
      // Category listings are real content hubs, so they belong in the sitemap.
      // Tag listings are noindex and deliberately left out.
      prisma.blogCategory.findMany({
        where: { posts: { some: { ...publishedPostWhere(), noIndex: false } } },
        select: { slug: true },
      }),
    ]);

    // /blog?page=2… — without these, everything past the first page is only
    // reachable by crawling the pagination links.
    const blogPages = Array.from(
      { length: Math.max(0, Math.ceil(posts.length / POSTS_PER_PAGE) - 1) },
      (_, i) => ({
        url: `${SITE_URL}/blog?page=${i + 2}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.4,
      })
    );

    return [
      ...staticRoutes,
      ...categories.map((c) => ({
        url: `${SITE_URL}/category/${c.slug}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
      ...occasions.map((o) => ({
        url: `${SITE_URL}/occasion/${o.slug}`,
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
      // A sub-collection under an inactive parent is unreachable — skip it
      // rather than list a URL that 404s.
      ...collections.flatMap((c) => {
        if (c.parent && !c.parent.isActive) return [];
        const path = c.parent
          ? `/curated-packs/${c.parent.slug}/${c.slug}`
          : `/curated-packs/${c.slug}`;
        return [
          {
            url: `${SITE_URL}${path}`,
            lastModified: c.updatedAt,
            changeFrequency: 'weekly' as const,
            priority: 0.7,
          },
        ];
      }),
      ...posts.map((post) => ({
        url: `${SITE_URL}/blog/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
      ...blogCategories.map((c) => ({
        url: `${SITE_URL}/blog?category=${c.slug}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      })),
      ...blogPages,
    ];
  } catch (error) {
    // A database hiccup shouldn't take the whole sitemap down — but log it,
    // because a sitemap silently missing every product is an SEO incident.
    console.error('sitemap: dynamic URL generation failed', error);
    return staticRoutes;
  }
}
