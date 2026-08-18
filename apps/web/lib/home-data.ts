import { prisma } from '@/lib/prisma';
import { serializeProduct } from '@/lib/serialize';
import { getHiddenCategoryIds, isHiddenCategory } from '@/lib/catalog-visibility';

/**
 * Server-side data for the homepage sections.
 *
 * These mirror the public API routes the client components hydrate from
 * (/api/products?sort=featured, /api/occasions,
 * /api/reviews/featured) so the SAME content is server-rendered into the
 * initial HTML — Google gets full product links + copy without executing JS,
 * and React Query hydrates from `initialData` with zero flash.
 *
 * Every function degrades to an empty result on DB errors — the homepage must
 * never 500 because one section's query hiccuped.
 */

/** Matches TrendingProducts: shape of GET /api/products?sort=featured&limit=6 */
export async function getFeaturedProducts(limit = 6) {
  try {
    const hiddenCategoryIds = await getHiddenCategoryIds();
    const products = await prisma.product.findMany({
      where: {
        status: 'active',
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
      // The homepage "Trending" rail: admin-flagged featured products lead, and
      // real view counts decide the order within (and after) them.
      orderBy: [{ isFeatured: 'desc' }, { viewCount: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
    return { products: products.map(serializeProduct) };
  } catch (error) {
    console.error('getFeaturedProducts failed:', error);
    return { products: [] };
  }
}

const TAILWIND_COLORS: Record<string, string> = {
  'orange-400': '#fb923c',
  'yellow-400': '#facc15',
  'blue-400': '#60a5fa',
  'cyan-400': '#22d3ee',
  'green-400': '#4ade80',
  'emerald-400': '#34d399',
  'purple-400': '#c084fc',
  'pink-400': '#f472b6',
  'red-400': '#f87171',
  'indigo-400': '#818cf8',
  'rose-400': '#fb7185',
  'amber-400': '#fbbf24',
  'teal-400': '#2dd4bf',
  'violet-400': '#a78bfa',
};

function convertTailwindGradient(tailwindGradient: string): string {
  const fromMatch = tailwindGradient.match(/from-(\w+-\d+)/);
  const toMatch = tailwindGradient.match(/to-(\w+-\d+)/);
  if (!fromMatch || !toMatch) return 'linear-gradient(135deg, #999999 0%, #666666 100%)';
  const fromColor = (fromMatch[1] && TAILWIND_COLORS[fromMatch[1]]) || '#999999';
  const toColor = (toMatch[1] && TAILWIND_COLORS[toMatch[1]]) || '#666666';
  return `linear-gradient(135deg, ${fromColor} 0%, ${toColor} 100%)`;
}

/**
 * Matches ShopByCategory: shape of GET /api/categories.
 *
 * Same visibility rules as the nav dropdown — top-level only (sub-categories
 * are a drill-down on the landing page), Packaging/Add-on stripped, and a
 * category must have at least one live catalog product either directly or on
 * one of its children, so no tile dead-ends on an empty grid.
 */
export async function getHomeCategories() {
  try {
    const categories = await prisma.category.findMany({
      where: {
        parentId: null,
        OR: [
          { products: { some: { product: { status: 'active', isPack: false } } } },
          { children: { some: { products: { some: { product: { status: 'active', isPack: false } } } } } },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { name: true, slug: true, imageUrl: true, description: true },
    });

    return categories.filter((c) => !isHiddenCategory(c)).map((c) => ({
      name: c.name,
      slug: c.slug,
      image: c.imageUrl || null,
      // `description` is rich text authored in admin — strip the markup so the
      // card subtitle never renders raw tags.
      description: stripHtml(c.description).slice(0, 80),
    }));
  } catch (error) {
    console.error('getHomeCategories failed:', error);
    return [];
  }
}

function stripHtml(value: string | null): string {
  if (!value) return '';
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Matches ShopByOccasion: shape of GET /api/occasions */
export async function getHomeOccasions() {
  try {
    const occasions = await prisma.occasionConfig.findMany({
      where: { isActive: true, isCollection: false },
      orderBy: [{ sortOrder: 'asc' }, { viewCount: 'desc' }],
    });

    const hiddenCategoryIds = await getHiddenCategoryIds();
    const occWithProducts = await prisma.productOccasion.findMany({
      where: {
        product: {
          status: 'active',
          ...(hiddenCategoryIds.length > 0
            ? { categories: { none: { categoryId: { in: hiddenCategoryIds } } } }
            : {}),
        },
      },
      select: { occasionId: true },
      distinct: ['occasionId'],
    });
    const withProducts = new Set(occWithProducts.map((o) => o.occasionId));

    return occasions
      .filter((o) => withProducts.has(o.id))
      .map((occasion) => ({
        icon: occasion.icon || '🎁',
        name: occasion.name,
        desc: occasion.description || 'Perfect for this occasion',
        image: occasion.imageUrl || null,
        bg:
          occasion.gradient && occasion.gradient.includes('from-') && occasion.gradient.includes('to-')
            ? convertTailwindGradient(occasion.gradient)
            : occasion.gradient || 'linear-gradient(135deg, #999999 0%, #666666 100%)',
        slug: occasion.slug,
      }));
  } catch (error) {
    console.error('getHomeOccasions failed:', error);
    return [];
  }
}

/** Matches CustomerReviews: the mapped card shape it builds from /api/reviews/featured */
export async function getFeaturedReviews() {
  try {
    const reviews = await prisma.review.findMany({
      where: { status: 'approved' },
      include: {
        user: { select: { name: true, company: { select: { name: true } } } },
        product: { select: { name: true, slug: true } },
      },
      orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
      take: 9,
    });
    return reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      authorName: r.user?.name || 'GIVOO Customer',
      role:
        r.user?.company?.name || (r.isVerifiedBuyer ? 'Verified Buyer' : 'Verified Customer'),
      productSlug: r.product.slug,
      isReal: true as const,
    }));
  } catch (error) {
    console.error('getFeaturedReviews failed:', error);
    return [];
  }
}
