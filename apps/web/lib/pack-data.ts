import { prisma } from '@/lib/prisma';
import { bandContains, type BudgetBand } from '@/lib/budget-bands';
import { orderPackOccasions } from '@/lib/pack-occasion-order';

// Shared loaders for the curated-pack pages.

function uniqueById(list: { id: string; name: string }[]) {
  const map = new Map<string, { id: string; name: string }>();
  for (const item of list) map.set(item.id, item);
  return Array.from(map.values());
}

// ──────────────────────────────────────────────────────────────────────────
// Budget / occasion taxonomy
//
// Curated packs are no longer browsed through GiftCollections. The two ways in
// are "By Budget" and "By Occasion", so these loaders read packs directly —
// which also means a pack with no collection at all is finally reachable.
// ──────────────────────────────────────────────────────────────────────────

export interface PackListItem {
  id: string;
  name: string;
  slug: string;
  image: string | null;

  gradient: null;
  /** Real content-modification stamp of the pack product — feeds sitemap lastmod. */
  updatedAt: Date;
  productCount: number;
  fromPrice: number;
  productImages: (string | null)[];
  productIds: string[];
  categories: { id: string; name: string }[];
  brands: string[];
  occasions: { id: string; name: string }[];
  recipients: string[];
  /** Occasion slugs this pack is filed under — drives the occasion pages. */
  occasionSlugs: string[];
}

// Every active pack with its members and their relations — the single most
// expensive thing the storefront does. One call takes 1.2-2.4s and allocates
// ~88 MB; three at once peaked at 321 MB, which OOM-kills a 1 GB container.
//
// The cache therefore lives HERE, not at one call site: nine places ask for
// this list (both pack hub pages, the nav and occasion API routes, the sitemap,
// the homepage rails, admin budget bands), and any one of them running
// uncached is enough to blow the memory budget on its own. React's cache()
// only dedupes within a single render, so it does NOT help across requests —
// this is a module-level cache with a TTL, shared by every request the process
// serves.
const CACHE_TTL_MS = 5 * 60_000;
let cached: { at: number; packs: PackListItem[] } | null = null;
let inFlight: Promise<PackListItem[]> | null = null;

export async function getPacks(): Promise<PackListItem[]> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.packs;
  // A cold cache under concurrent requests must not start N identical loads —
  // that is exactly the pile-up that ran the container out of memory.
  if (!inFlight) {
    inFlight = loadPacks()
      .then((packs) => {
        cached = { at: Date.now(), packs };
        return packs;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/** Drop the cached list — call after an admin edit changes packs. */
export function invalidatePacks() {
  cached = null;
}

async function loadPacks(): Promise<PackListItem[]> {
  const packs = await prisma.product.findMany({
    where: { isPack: true, status: 'active' },
    // Popularity-ranked under the admin's manual `sortOrder` — same rule as the
    // product catalog, so packs and products rank consistently.
    orderBy: [{ sortOrder: 'asc' }, { viewCount: 'desc' }, { createdAt: 'desc' }],
    // Explicit `select`, NOT `include`. `include` returns every scalar column of
    // the pack, which dragged descriptionLong + descriptionShort out of Postgres
    // for all 2088 active packs (~3.3 MB) and serialised them into the HTML of
    // every curated-pack page — where neither is ever rendered. That alone made
    // single pages 3.7 MB, and caching those pages exhausted the app instance.
    select: {
      id: true,
      name: true,
      slug: true,
      updatedAt: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      occasions: {
        select: { occasion: { select: { id: true, name: true, slug: true, isCollection: true } } },
      },
      packItems: {
        orderBy: { sortOrder: 'asc' },
        select: {
          productId: true,
          quantity: true,
          product: {
            select: {
              brand: true,
              recipientTags: true,
              images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
              // Highest-quantity tier — the cheapest per-unit rate, which is
              // what the "From ₹x /pack" figure on the listing quotes.
              priceTiers: { orderBy: { minQty: 'desc' }, take: 1, select: { sellPrice: true } },
              categories: { select: { category: { select: { id: true, name: true } } } },
              occasions: {
                select: { occasion: { select: { id: true, name: true, slug: true, isCollection: true } } },
              },
            },
          },
        },
      },
    },
  });

  return packs.map((pack) => {
    const members = pack.packItems;
    const categories = uniqueById(
      members.flatMap((it) => it.product.categories.map((pc) => pc.category))
    );

    // The admin's own tagging on the pack wins. Only when a pack carries no
    // occasion of its own do we fall back to what its members are tagged with,
    // so packs created before this taxonomy existed still surface somewhere.
    const ownOccasions = pack.occasions.map((po) => po.occasion).filter((o) => !o.isCollection);
    const memberOccasions = members
      .flatMap((it) => it.product.occasions.map((po) => po.occasion))
      .filter((o) => !o.isCollection);
    const resolved = ownOccasions.length > 0 ? ownOccasions : memberOccasions;
    const occasionMap = new Map(resolved.map((o) => [o.id, o]));
    const occasionList = Array.from(occasionMap.values());

    return {
      id: pack.id,
      name: pack.name,
      slug: pack.slug,
      image: pack.images[0]?.url ?? null,
      gradient: null as null,
      updatedAt: pack.updatedAt,
      productCount: members.length,
      fromPrice: members.reduce((sum, it) => {
        const bestTier = it.product.priceTiers[0];
        return sum + (bestTier ? Number(bestTier.sellPrice) : 0) * it.quantity;
      }, 0),
      productImages: members.map((it) => it.product.images[0]?.url ?? null),
      productIds: members.map((it) => it.productId),
      categories,
      brands: Array.from(
        new Set(members.map((it) => it.product.brand).filter((b): b is string => Boolean(b)))
      ),
      occasions: occasionList.map((o) => ({ id: o.id, name: o.name })),
      recipients: Array.from(
        new Set(members.flatMap((it) => it.product.recipientTags).filter(Boolean))
      ),
      occasionSlugs: occasionList.map((o) => o.slug),
    };
  });
}

/** Every active band, in the admin's display order. */
export async function getBudgetBands(): Promise<BudgetBand[]> {
  const rows = await prisma.budgetBand.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { minPrice: 'asc' }],
  });
  return rows.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    description: b.description,
    image: b.imageUrl,
    gradient: b.gradient,
    min: b.minPrice,
    max: b.maxPrice,
    metaTitle: b.metaTitle,
    metaDescription: b.metaDescription,
    contentBelow: b.contentBelow,
    faqs: Array.isArray(b.faqs) ? (b.faqs as unknown as { question: string; answer: string }[]) : [],
  }));
}

/** One band by slug, or null. Inactive bands are not reachable. */
export async function getBudgetBand(slug: string) {
  const bands = await getBudgetBands();
  return bands.find((b) => b.slug === slug) ?? null;
}

/** Bands that actually hold packs — an empty band is not a destination. */
export async function getBudgetTiles(packs: PackListItem[]) {
  const bands = await getBudgetBands();
  return bands
    .map((band) => ({
      band,
      count: packs.filter((p) => bandContains(band, p.fromPrice)).length,
    }))
    .filter((b) => b.count > 0);
}

/** Occasions that actually hold packs — featured ones first, then admin order. */
export async function getPackOccasionTiles(packs: PackListItem[]) {
  const occasions = await prisma.occasionConfig.findMany({
    // `isCollection` entries are the homepage's curated collections, not
    // occasions — they never belong on the occasion tiles.
    where: { isActive: true, isCollection: false },
    select: {
      id: true,
      name: true,
      packName: true,
      slug: true,
      imageUrl: true,
      gradient: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { viewCount: 'desc' }],
  });

  const tiles = occasions
    .map((o) => ({
      id: o.id,
      // Tiles here link only to /curated-packs/occasions/[slug] — the pack
      // page's own name wins when the admin set one.
      name: o.packName || o.name,
      slug: o.slug,
      image: o.imageUrl,
      gradient: o.gradient,
      count: packs.filter((p) => p.occasionSlugs.includes(o.slug)).length,
    }))
    .filter((o) => o.count > 0);

  // Featured occasions lead everywhere these tiles are used — homepage,
  // /curated-packs, the nav cascade — so the eight that matter are the eight
  // the homepage teaser shows.
  return orderPackOccasions(tiles);
}
