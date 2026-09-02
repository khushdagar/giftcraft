import { getPacks, getBudgetTiles, getPackOccasionTiles } from '@/lib/pack-data';
import { bandContains } from '@/lib/budget-bands';
import { SITE_URL } from '@/lib/site';
import { urlsetXml, sitemapResponse, latest, type SitemapEntry } from '@/lib/sitemap-xml';

export const dynamic = 'force-dynamic';

// Curated packs: the budget/occasion hub pages, every band and occasion
// listing that actually holds packs, and the pack detail pages themselves.
// getPacks() is the module-level cached loader — never query packs raw here.
export async function GET() {
  const entries: SitemapEntry[] = [];

  try {
    const packs = await getPacks();
    const [budgetBands, packOccasions] = await Promise.all([
      getBudgetTiles(packs),
      getPackOccasionTiles(packs),
    ]);

    // A listing page changed when any pack on it changed.
    const allPacksMax = latest(packs.map((p) => p.updatedAt));

    entries.push(
      { url: `${SITE_URL}/curated-packs`, lastmod: allPacksMax, changefreq: 'weekly', priority: 0.8 },
      { url: `${SITE_URL}/curated-packs/budget`, lastmod: allPacksMax, changefreq: 'weekly', priority: 0.8 },
      { url: `${SITE_URL}/curated-packs/occasions`, lastmod: allPacksMax, changefreq: 'weekly', priority: 0.8 },
      ...budgetBands.map((b) => ({
        url: `${SITE_URL}/curated-packs/budget/${b.band.slug}`,
        lastmod: latest(
          packs.filter((p) => bandContains(b.band, p.fromPrice)).map((p) => p.updatedAt)
        ),
        changefreq: 'weekly' as const,
        priority: 0.7,
      })),
      ...packOccasions.map((o) => ({
        url: `${SITE_URL}/curated-packs/occasions/${o.slug}`,
        lastmod: latest(
          packs.filter((p) => p.occasionSlugs.includes(o.slug)).map((p) => p.updatedAt)
        ),
        changefreq: 'weekly' as const,
        priority: 0.7,
      })),
      // Pack detail pages live under /products/* like any product, but they are
      // curated packs — they belong to this child, not sitemap-products.
      ...packs.map((p) => ({
        url: `${SITE_URL}/products/${p.slug}`,
        lastmod: p.updatedAt,
        changefreq: 'weekly' as const,
        priority: 0.8,
      }))
    );
  } catch (error) {
    console.error('sitemap-packs: generation failed', error);
  }

  return sitemapResponse(urlsetXml(entries));
}
