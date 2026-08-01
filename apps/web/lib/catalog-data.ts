import { prisma } from '@/lib/prisma';
import { serializeProduct } from '@/lib/serialize';
import { isHiddenCategory, getHiddenCategoryIds } from '@/lib/catalog-visibility';

/**
 * Server-side catalog data. Mirrors GET /api/products (unfiltered, sort=featured)
 * and GET /api/catalog/filters so the /catalog page can render the full product
 * grid in the initial HTML — the crawler's main path to every product page —
 * while the client keeps hydrating from the same API shapes.
 */

export async function getCatalogProducts(limit = 1000) {
  try {
    const hiddenCategoryIds = await getHiddenCategoryIds();

    const products = await prisma.product.findMany({
      where: {
        status: 'active',
        // Packs are bundles, not catalog SKUs — never list them among products.
        isPack: false,
        ...(hiddenCategoryIds.length > 0 && {
          AND: [{ categories: { none: { categoryId: { in: hiddenCategoryIds } } } }],
        }),
      },
      include: {
        priceTiers: { orderBy: { tier: 'asc' } },
        images: { orderBy: { sortOrder: 'asc' }, take: 4 },
        variants: { where: { kind: 'color' }, orderBy: { sortOrder: 'asc' } },
        hsn: { include: { hsn: true } },
        categories: { include: { category: true } },
        occasions: { include: { occasion: true } },
      },
      orderBy: { isFeatured: 'desc' },
      take: limit,
    });

    // Fold tag-driven occasions/collections into each product's occasionIds so
    // the client-side occasion filter matches them (same as /api/products).
    const taggedOccasions = await prisma.occasionConfig.findMany({
      where: { isActive: true, NOT: { tags: { isEmpty: true } } },
      select: { id: true, tags: true },
    });
    return products.map((p) => {
      const s = serializeProduct(p);
      if (taggedOccasions.length > 0 && (s.tags?.length ?? 0) > 0) {
        const matched = taggedOccasions
          .filter((o) => o.tags.some((t) => s.tags!.includes(t)))
          .map((o) => o.id);
        if (matched.length > 0) {
          s.occasionIds = Array.from(new Set([...(s.occasionIds ?? []), ...matched]));
        }
      }
      return s;
    });
  } catch (error) {
    console.error('getCatalogProducts failed:', error);
    return [];
  }
}

export async function getCatalogFilters() {
  try {
    const hiddenCategoryIds = await getHiddenCategoryIds();

    const [categoriesRaw, occasions] = await Promise.all([
      prisma.category.findMany({
        where: { parentId: null },
        include: {
          children: { include: { children: true }, orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.occasionConfig.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    const categories = categoriesRaw
      .filter((cat) => !isHiddenCategory(cat))
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        subcategories: c.children?.map((ch) => ({ id: ch.id, name: ch.name })),
      }));

    return {
      categories,
      occasions: occasions.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        isCollection: o.isCollection,
      })),
    };
  } catch (error) {
    console.error('getCatalogFilters failed:', error);
    return { categories: [], occasions: [] };
  }
}
