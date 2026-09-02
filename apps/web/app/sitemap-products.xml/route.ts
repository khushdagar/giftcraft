import { prisma } from '@/lib/prisma';
import { getHiddenCategoryIds } from '@/lib/catalog-visibility';
import { SITE_URL } from '@/lib/site';
import { urlsetXml, sitemapResponse, type SitemapEntry } from '@/lib/sitemap-xml';

export const dynamic = 'force-dynamic';

// Every live standalone product — Google's main discovery path for PDPs.
// Curated packs (isPack) live in sitemap-packs.xml instead.
export async function GET() {
  const entries: SitemapEntry[] = [];

  try {
    const hiddenCategoryIds = await getHiddenCategoryIds();
    const products = await prisma.product.findMany({
      where: {
        status: 'active',
        isPack: false,
        ...(hiddenCategoryIds.length > 0
          ? { categories: { none: { categoryId: { in: hiddenCategoryIds } } } }
          : {}),
      },
      select: { slug: true, updatedAt: true },
    });

    entries.push(
      ...products.map((p) => ({
        url: `${SITE_URL}/products/${p.slug}`,
        lastmod: p.updatedAt,
        changefreq: 'weekly' as const,
        priority: 0.8,
      }))
    );
  } catch (error) {
    console.error('sitemap-products: generation failed', error);
  }

  return sitemapResponse(urlsetXml(entries));
}
