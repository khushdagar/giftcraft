import { prisma } from '@/lib/prisma';
import { getHiddenCategoryIds } from '@/lib/catalog-visibility';

/**
 * Server-side data for the occasion landing pages (/occasions and
 * /occasion/[slug]).
 *
 * Mirrors lib/category-data.ts: both pages are fully server-rendered so every
 * product link is in the initial HTML, giving Google a crawlable path from the
 * site root down to each product.
 *
 * Occasion membership is TWO-SIDED, unlike categories:
 *   1. an explicit ProductOccasion link, and
 *   2. a tag overlap — a product whose `tags` intersect the occasion's `tags`.
 * Curated Collections (isCollection) are driven entirely by rule 2. Both must be
 * honoured everywhere or a collection page renders empty.
 *
 * Visibility rules mirror the catalog: active, non-pack products only, with the
 * packaging/add-on categories excluded. Occasions with no live products are
 * dropped from listings — an empty occasion page is a thin page.
 */

export type OccasionSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  imageUrl: string | null;
  gradient: string | null;
  isCollection: boolean;
  productCount: number;
  /** Up to 4 product images, for the listing card collage. */
  previewImages: string[];
  /** Lowest tier-1 price across the occasion, for a "from" line. */
  fromPrice: number | null;
};

/** The where-clause fragment matching products that belong to an occasion. */
function membershipWhere(occasion: { id: string; tags: string[] }) {
  return {
    OR: [
      { occasions: { some: { occasionId: occasion.id } } },
      ...(occasion.tags.length > 0 ? [{ tags: { hasSome: occasion.tags } }] : []),
    ],
  };
}

/** All active occasions/collections that have at least one live product. */
export async function getOccasionSummaries(
  /** `true` for the Curated Collections listing, `false` for Shop by Occasion. */
  isCollection = false
): Promise<OccasionSummary[]> {
  try {
    const hiddenCategoryIds = await getHiddenCategoryIds();

    // One pass over the live catalog, grouped in memory — cheaper than a count
    // + image query per occasion.
    const [occasions, products] = await Promise.all([
      prisma.occasionConfig.findMany({
        where: { isActive: true, isCollection },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.product.findMany({
        where: {
          status: 'active',
          isPack: false,
          ...(hiddenCategoryIds.length > 0 && {
            categories: { none: { categoryId: { in: hiddenCategoryIds } } },
          }),
        },
        select: {
          tags: true,
          occasions: { select: { occasionId: true } },
          images: {
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            take: 1,
            select: { url: true },
          },
          priceTiers: { where: { tier: 1 }, take: 1, select: { sellPrice: true } },
        },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    return occasions
      .map((occasion) => {
        const tagSet = new Set(occasion.tags);
        const members = products.filter(
          (p) =>
            p.occasions.some((o) => o.occasionId === occasion.id) ||
            p.tags.some((t) => tagSet.has(t))
        );
        const prices = members
          .map((p) => (p.priceTiers[0] ? Number(p.priceTiers[0].sellPrice) : 0))
          .filter((n) => n > 0);

        return {
          id: occasion.id,
          name: occasion.name,
          slug: occasion.slug,
          description: occasion.description,
          icon: occasion.icon,
          imageUrl: occasion.imageUrl,
          gradient: occasion.gradient,
          isCollection: occasion.isCollection,
          productCount: members.length,
          previewImages: members
            .map((p) => p.images[0]?.url)
            .filter((url): url is string => !!url)
            .slice(0, 4),
          fromPrice: prices.length ? Math.min(...prices) : null,
        };
      })
      .filter((occasion) => occasion.productCount > 0);
  } catch (error) {
    console.error('getOccasionSummaries failed:', error);
    return [];
  }
}

/**
 * Lightweight list of active occasions — id, name, slug only. Use this for
 * navigation (sibling links, sitemap); getOccasionSummaries() scans the whole
 * catalogue and is far too heavy to run on every page render.
 */
export async function getOccasionNav(
  isCollection = false
): Promise<Array<{ id: string; name: string; slug: string }>> {
  try {
    return await prisma.occasionConfig.findMany({
      where: { isActive: true, isCollection },
      select: { id: true, name: true, slug: true },
      orderBy: { sortOrder: 'asc' },
    });
  } catch (error) {
    console.error('getOccasionNav failed:', error);
    return [];
  }
}

/** Slugs for the sitemap — every active occasion and collection. */
export async function getOccasionSlugs(): Promise<
  Array<{ slug: string; isCollection: boolean }>
> {
  try {
    return await prisma.occasionConfig.findMany({
      where: { isActive: true },
      select: { slug: true, isCollection: true },
    });
  } catch (error) {
    console.error('getOccasionSlugs failed:', error);
    return [];
  }
}

/**
 * A single occasion with its live products. Returns null when the slug does not
 * exist or the occasion is inactive — the page 404s on null. An active occasion
 * with zero live products still resolves, so the page can render an honest
 * empty state instead of a soft 404.
 */
export async function getOccasionBySlug(slug: string): Promise<{
  id: string;
  name: string;
  slug: string;
  description: string | null;
  contentBelow: string | null;
  isCollection: boolean;
  tags: string[];
  productCount: number;
  /** Name + slug of each member product, for the CollectionPage JSON-LD. */
  products: Array<{ name: string; slug: string; imageUrl: string | null }>;
} | null> {
  try {
    const occasion = await prisma.occasionConfig.findUnique({ where: { slug } });
    if (!occasion || !occasion.isActive) return null;

    const hiddenCategoryIds = await getHiddenCategoryIds();
    const products = await prisma.product.findMany({
      where: {
        status: 'active',
        isPack: false,
        ...membershipWhere(occasion),
        ...(hiddenCategoryIds.length > 0 && {
          AND: [{ categories: { none: { categoryId: { in: hiddenCategoryIds } } } }],
        }),
      },
      select: {
        name: true,
        slug: true,
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          take: 1,
          select: { url: true },
        },
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      id: occasion.id,
      name: occasion.name,
      slug: occasion.slug,
      description: occasion.description,
      contentBelow: occasion.contentBelow,
      isCollection: occasion.isCollection,
      tags: occasion.tags,
      productCount: products.length,
      products: products.map((p) => ({
        name: p.name,
        slug: p.slug,
        imageUrl: p.images[0]?.url ?? null,
      })),
    };
  } catch (error) {
    console.error(`getOccasionBySlug(${slug}) failed:`, error);
    return null;
  }
}
