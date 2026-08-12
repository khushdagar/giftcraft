import { prisma } from '@/lib/prisma';
import { isHiddenCategory, getHiddenCategoryIds } from '@/lib/catalog-visibility';

/**
 * Server-side data for the category landing pages (/categories and
 * /category/[slug]).
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

/**
 * The customer-facing "from" price is the CHEAPEST tier (the highest-MOQ slab),
 * not tier 1 — tier 1 is the most expensive, below-MOQ rate.
 */
function minTierPrice(tiers: Array<{ sellPrice: unknown }>): number | null {
  const values = tiers.map((t) => Number(t.sellPrice)).filter((n) => n > 0);
  return values.length > 0 ? Math.min(...values) : null;
}

export type CategorySummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  /** Cover photo set in the admin — the listing card's hero image. */
  imageUrl: string | null;
  productCount: number;
  /** Up to 4 product images, for the listing card collage. */
  previewImages: string[];
  /** Lowest tier-1 price across the category, for a "from" line. */
  fromPrice: number | null;
  /** Populated sub-categories, in sort order. Empty for a sub-category itself. */
  children: CategorySummary[];
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
      // Every category — the index lists each department AND its
      // sub-categories, so a shopper can jump straight to "Laptop Backpack"
      // without first landing on "Bags & Travel". Nesting is rebuilt below.
      prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
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
          // All tiers — the "from" price is the CHEAPEST slab (highest MOQ).
          priceTiers: { select: { sellPrice: true } },
        },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    const byCategory = new Map<string, { images: string[]; prices: number[]; count: number }>();
    for (const product of products) {
      const image = product.images[0]?.url;
      const price = minTierPrice(product.priceTiers);
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

    const summarise = (category: (typeof categories)[number]): CategorySummary => {
      const bucket = byCategory.get(category.id);
      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        imageUrl: category.imageUrl,
        productCount: bucket?.count ?? 0,
        previewImages: bucket?.images ?? [],
        fromPrice: bucket?.prices.length ? Math.min(...bucket.prices) : null,
        children: [],
      };
    };

    // An empty category is a dead-end page, so it stays off the index whether
    // it's a department or a sub-category.
    const visible = categories.filter(
      (category) => !isHiddenCategory(category) && (byCategory.get(category.id)?.count ?? 0) > 0
    );
    const visibleIds = new Set(visible.map((c) => c.id));

    return visible
      // A sub-category whose parent was filtered out (hidden or empty) has
      // nowhere to nest, so it is promoted to a top-level card.
      .filter((category) => !category.parentId || !visibleIds.has(category.parentId))
      .map((parent) => ({
        ...summarise(parent),
        children: visible
          .filter((child) => child.parentId === parent.id)
          .map(summarise),
      }));
  } catch (error) {
    console.error('getCategorySummaries failed:', error);
    return [];
  }
}

/**
 * Lightweight list of categories that have live products — id, name, slug only.
 *
 * Use this for navigation (sibling links, sitemap). getCategorySummaries() scans
 * the whole catalogue to build counts and image collages, which is far too heavy
 * to run on every category page render.
 */
export async function getCategoryNav(): Promise<Array<{ id: string; name: string; slug: string }>> {
  try {
    const categories = await prisma.category.findMany({
      // Top-level only, matching the footer and nav dropdown.
      where: {
        parentId: null,
        OR: [
          { products: { some: { product: { status: 'active', isPack: false } } } },
          { children: { some: { products: { some: { product: { status: 'active', isPack: false } } } } } },
        ],
      },
      select: { id: true, name: true, slug: true },
      orderBy: { sortOrder: 'asc' },
    });
    return categories.filter((c) => !isHiddenCategory(c));
  } catch (error) {
    console.error('getCategoryNav failed:', error);
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
  contentBelow: string | null;
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
        // All tiers — the "from" price is the CHEAPEST slab (highest MOQ).
        priceTiers: { select: { sellPrice: true } },
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      contentBelow: category.contentBelow,
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        brand: product.brand,
        imageUrl: product.images[0]?.url ?? null,
        price: minTierPrice(product.priceTiers) ?? 0,
        isEcoCertified: product.isEcoCertified,
        moq: product.moq ?? null,
      })),
    };
  } catch (error) {
    console.error(`getCategoryBySlug(${slug}) failed:`, error);
    return null;
  }
}
