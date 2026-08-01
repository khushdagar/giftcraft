import { prisma } from '@/lib/prisma';
import { isHiddenCategory, getHiddenCategoryIds } from '@/lib/catalog-visibility';

/**
 * Server-side data for the category landing pages (/categories and
 * /categories/[slug]).
 *
 * Both pages are fully server-rendered so every product link is in the initial
 * HTML — these pages exist to give Google a crawlable path from the site root
 * down to each product, which the client-filtered /catalog cannot provide on
 * its own.
 *
 * Visibility rules mirror the catalog exactly: active, non-pack products only,
 * with the packaging/add-on categories excluded. Categories with no live
 * products are dropped from listings entirely — an empty category page is a
 * thin page, and linking to one wastes crawl budget.
 */

export type CategorySummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  productCount: number;
  /** Up to 4 product images, for the listing card collage. */
  previewImages: string[];
  /** Lowest tier-1 price across the category, for a "from" line. */
  fromPrice: number | null;
};

export type CategoryProduct = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  imageUrl: string | null;
  price: number;
  isEcoCertified: boolean;
  moq: number | null;
};

/** All catalog-visible categories that have at least one live product. */
export async function getCategorySummaries(): Promise<CategorySummary[]> {
  try {
    const hiddenCategoryIds = await getHiddenCategoryIds();

    // One pass over the live catalog, grouped in memory — cheaper and simpler
    // than a count + image query per category.
    const [categories, products] = await Promise.all([
      prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.product.findMany({
        where: {
          status: 'active',
          isPack: false,
          ...(hiddenCategoryIds.length > 0 && {
            categories: { none: { categoryId: { in: hiddenCategoryIds } } },
          }),
        },
        select: {
          isFeatured: true,
          categories: { select: { categoryId: true } },
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

    const byCategory = new Map<string, { images: string[]; prices: number[]; count: number }>();
    for (const product of products) {
      const image = product.images[0]?.url;
      const price = product.priceTiers[0] ? Number(product.priceTiers[0].sellPrice) : null;
      for (const { categoryId } of product.categories) {
        let bucket = byCategory.get(categoryId);
        if (!bucket) {
          bucket = { images: [], prices: [], count: 0 };
          byCategory.set(categoryId, bucket);
        }
        bucket.count += 1;
        if (image && bucket.images.length < 4) bucket.images.push(image);
        if (price && price > 0) bucket.prices.push(price);
      }
    }

    return categories
      .filter((category) => !isHiddenCategory(category))
      .map((category) => {
        const bucket = byCategory.get(category.id);
        return {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          productCount: bucket?.count ?? 0,
          previewImages: bucket?.images ?? [],
          fromPrice: bucket?.prices.length ? Math.min(...bucket.prices) : null,
        };
      })
      .filter((category) => category.productCount > 0);
  } catch (error) {
    console.error('getCategorySummaries failed:', error);
    return [];
  }
}

/** Slugs for generateStaticParams — every catalog-visible category. */
export async function getCategorySlugs(): Promise<string[]> {
  try {
    const categories = await prisma.category.findMany({ select: { name: true, slug: true } });
    return categories.filter((c) => !isHiddenCategory(c)).map((c) => c.slug);
  } catch (error) {
    console.error('getCategorySlugs failed:', error);
    return [];
  }
}

/**
 * A single category with its live products. Returns null when the slug does
 * not exist or names a hidden (packaging/add-on) category — the page 404s on
 * null. A real category with zero live products still resolves, so the page
 * can render an honest empty state instead of a soft 404.
 */
export async function getCategoryBySlug(slug: string): Promise<{
  id: string;
  name: string;
  slug: string;
  description: string | null;
  products: CategoryProduct[];
} | null> {
  try {
    const category = await prisma.category.findUnique({ where: { slug } });
    if (!category || isHiddenCategory(category)) return null;

    const products = await prisma.product.findMany({
      where: {
        status: 'active',
        isPack: false,
        categories: { some: { categoryId: category.id } },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        brand: true,
        moq: true,
        isEcoCertified: true,
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          take: 1,
          select: { url: true },
        },
        priceTiers: { where: { tier: 1 }, take: 1, select: { sellPrice: true } },
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        brand: product.brand,
        imageUrl: product.images[0]?.url ?? null,
        price: product.priceTiers[0] ? Number(product.priceTiers[0].sellPrice) : 0,
        isEcoCertified: product.isEcoCertified,
        moq: product.moq ?? null,
      })),
    };
  } catch (error) {
    console.error(`getCategoryBySlug(${slug}) failed:`, error);
    return null;
  }
}
