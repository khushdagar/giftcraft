import { prisma } from '@/lib/prisma';
import { serializeProduct } from '@/lib/serialize';
import { isHiddenCategory, getHiddenCategoryIds } from '@/lib/catalog-visibility';

/**
 * Server-side catalog data. Mirrors GET /api/products (unfiltered, sort=featured)
 * and GET /api/catalog/filters so the /catalog page can render the full product
 * grid in the initial HTML — the crawler's main path to every product page —
 * while the client keeps hydrating from the same API shapes.
 */

export async function getCatalogProducts(
  limit = 1000,
  /** Narrow to one category — the /category/[slug] pages only need theirs. */
  categoryId?: string,
  /**
   * Narrow to one occasion/collection — the /occasion/[slug] pages only need
   * theirs. Membership is either an explicit ProductOccasion link OR a tag
   * overlap, which is how tag-driven Collections work.
   */
  occasion?: { id: string; tags: string[] }
) {
  try {
    const hiddenCategoryIds = await getHiddenCategoryIds();

    const products = await prisma.product.findMany({
      where: {
        status: 'active',
        // Packs are bundles, not catalog SKUs — never list them among products.
        isPack: false,
        ...(categoryId ? { categories: { some: { categoryId } } } : {}),
        ...(occasion
          ? {
              OR: [
                { occasions: { some: { occasionId: occasion.id } } },
                ...(occasion.tags.length > 0 ? [{ tags: { hasSome: occasion.tags } }] : []),
              ],
            }
          : {}),
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
      // Popularity-ranked, matching /api/products: admin `sortOrder` leads,
      // viewCount breaks ties, createdAt keeps zero-view products stable.
      orderBy: [{ sortOrder: 'asc' }, { viewCount: 'desc' }, { createdAt: 'desc' }],
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
      return toCatalogCard(s);
    });
  } catch (error) {
    console.error('getCatalogProducts failed:', error);
    return [];
  }
}

/**
 * The only product fields the catalog grid and its filters actually read —
 * see the `Product` interface in components/catalog/catalog-client.tsx, which
 * has always declared exactly this much.
 *
 * The server was sending the whole row instead: descriptionLong, keyFeatures,
 * specifications, metaDescription, the full occasion records and the HSN
 * relation, none of which the grid touches. On 176 products that was 1.3 MB
 * baked into /catalog's HTML, over half of it fields nothing could render.
 * Product detail pages load the full record separately and are unaffected.
 */
export interface CatalogCard {
  id: string;
  name: string;
  slug: string;
  sku?: string | null;
  brand?: string | null;
  icon?: string | null;
  moq?: number | null;
  material?: string | null;
  leadTimeDays?: number | null;
  printingTechnique?: string | null;
  isEcoCertified?: boolean | null;
  descriptionShort?: string | null;
  tags?: string[];
  recipientTags?: string[];
  occasionIds?: string[];
  priceTiers: { minQty: number; sellPrice: number }[];
  categories: { categoryId: string; category?: { name: string } }[];
  images: { id: string; url: string; isPrimary?: boolean }[];
  variants: { id?: string; kind?: string; value: string; hexColor?: string | null; imageUrl?: string | null }[];
}

export function toCatalogCard(s: any): CatalogCard {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    sku: s.sku ?? null,
    brand: s.brand ?? null,
    icon: s.icon ?? null,
    moq: s.moq ?? null,
    material: s.material ?? null,
    leadTimeDays: s.leadTimeDays ?? null,
    printingTechnique: s.printingTechnique ?? null,
    isEcoCertified: s.isEcoCertified ?? null,
    descriptionShort: s.descriptionShort ?? null,
    tags: s.tags ?? [],
    recipientTags: s.recipientTags ?? [],
    occasionIds: s.occasionIds ?? [],
    // The card quotes a "from" price; minQty rides along so the slab stays
    // identifiable without shipping cost prices or tier metadata.
    priceTiers: (s.priceTiers ?? []).map((t: any) => ({
      minQty: t.minQty,
      sellPrice: t.sellPrice,
    })),
    categories: (s.categories ?? []).map((c: any) => ({
      categoryId: c.categoryId,
      category: c.category ? { name: c.category.name } : undefined,
    })),
    images: (s.images ?? []).map((i: any) => ({
      id: i.id,
      url: i.url,
      isPrimary: i.isPrimary ?? undefined,
    })),
    variants: (s.variants ?? []).map((v: any) => ({
      id: v.id,
      kind: v.kind,
      value: v.value,
      hexColor: v.hexColor ?? null,
      imageUrl: v.imageUrl ?? null,
    })),
  };
}

export async function getCatalogFilters() {
  try {
    // Hidden categories are filtered by name/slug below (isHiddenCategory), so
    // no separate id lookup is needed here.
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
