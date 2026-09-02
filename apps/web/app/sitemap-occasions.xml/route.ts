import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/site';
import { urlsetXml, sitemapResponse, latest, type SitemapEntry } from '@/lib/sitemap-xml';

export const dynamic = 'force-dynamic';

// Occasion hub + every occasion (and tag-driven collection) landing page at
// /occasion/*, matching what getOccasionSlugs fed the old flat sitemap.
export async function GET() {
  const entries: SitemapEntry[] = [];

  try {
    const occasions = await prisma.occasionConfig.findMany({
      where: { isActive: true },
      select: { id: true, slug: true },
    });

    // An occasion page's content is the products tagged with it — stamp it
    // with the newest of those, not the request time.
    const maxes = await Promise.all(
      occasions.map((o) =>
        prisma.product.aggregate({
          where: { status: 'active', occasions: { some: { occasionId: o.id } } },
          _max: { updatedAt: true },
        })
      )
    );

    entries.push(
      {
        url: `${SITE_URL}/occasions`,
        lastmod: latest(maxes.map((m) => m._max.updatedAt)),
        changefreq: 'weekly',
        priority: 0.9,
      },
      ...occasions.map((o, i) => ({
        url: `${SITE_URL}/occasion/${o.slug}`,
        lastmod: maxes[i]?._max.updatedAt ?? null,
        changefreq: 'weekly' as const,
        priority: 0.8,
      }))
    );
  } catch (error) {
    console.error('sitemap-occasions: generation failed', error);
  }

  return sitemapResponse(urlsetXml(entries));
}
