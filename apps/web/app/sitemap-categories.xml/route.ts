import { prisma } from '@/lib/prisma';
import { isHiddenCategory } from '@/lib/catalog-visibility';
import { SITE_URL } from '@/lib/site';
import { urlsetXml, sitemapResponse, latest, type SitemapEntry } from '@/lib/sitemap-xml';

export const dynamic = 'force-dynamic';

// Category hub + every category landing page with live products — top-level
// AND sub-categories, since /category/[slug] resolves any level by slug.
// Categories with no directly-assigned live products are left out (the page
// would be empty, which is noindex), matching the hidden-category rules.
export async function GET() {
  const entries: SitemapEntry[] = [];

  try {
    const categories = (
      await prisma.category.findMany({
        where: { products: { some: { product: { status: 'active', isPack: false } } } },
        select: { id: true, slug: true, name: true, parentId: true },
        orderBy: { sortOrder: 'asc' },
      })
    ).filter((c) => !isHiddenCategory(c));

    // A category page's content is its products — its real modification stamp
    // is the newest product directly assigned to it, mirroring exactly what
    // getCategoryBySlug renders on that page.
    const maxes = await Promise.all(
      categories.map((c) =>
        prisma.product.aggregate({
          where: {
            status: 'active',
            isPack: false,
            categories: { some: { categoryId: c.id } },
          },
          _max: { updatedAt: true },
        })
      )
    );

    entries.push(
      {
        url: `${SITE_URL}/categories`,
        lastmod: latest(maxes.map((m) => m._max.updatedAt)),
        changefreq: 'weekly',
        priority: 0.9,
      },
      ...categories.map((c, i) => ({
        url: `${SITE_URL}/category/${c.slug}`,
        lastmod: maxes[i]._max.updatedAt,
        changefreq: 'weekly' as const,
        // Departments outrank their sub-categories, same as the site's own
        // navigation hierarchy.
        priority: c.parentId ? 0.7 : 0.8,
      }))
    );
  } catch (error) {
    console.error('sitemap-categories: generation failed', error);
  }

  return sitemapResponse(urlsetXml(entries));
}
