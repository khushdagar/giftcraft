import { prisma } from '@/lib/prisma';

// Shared loader for the curated-pack pages: /packs (collection hub) and
// /curated-packs (flat list of every pack). Both need the same shape, so the
// query lives here rather than being duplicated per route.

function uniqueById(list: { id: string; name: string }[]) {
  const map = new Map<string, { id: string; name: string }>();
  for (const item of list) map.set(item.id, item);
  return Array.from(map.values());
}

export async function getPackCollections() {
  const collections = await prisma.giftCollection.findMany({
    where: { isActive: true },
    include: {
      packProducts: {
        where: { isPack: true, status: 'active' },
        // Popularity-ranked under the admin's manual `sortOrder` — same rule as
        // the product catalog, so packs and products rank consistently.
        orderBy: [{ sortOrder: 'asc' }, { viewCount: 'desc' }, { createdAt: 'desc' }],
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          packItems: {
            orderBy: { sortOrder: 'asc' },
            include: {
              product: {
                select: {
                  brand: true,
                  recipientTags: true,
                  images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                  // Highest-quantity tier — the cheapest per-unit rate, which is
                  // what the "From ₹x /pack" figure on the listing quotes.
                  priceTiers: {
                    orderBy: { minQty: 'desc' },
                    take: 1,
                    select: { sellPrice: true },
                  },
                  categories: { select: { category: { select: { id: true, name: true } } } },
                  occasions: {
                    select: { occasion: { select: { id: true, name: true, isCollection: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  return collections
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      image: c.image,
      gradient: c.gradient,
      packs: c.packProducts.map((pack) => {
        const members = pack.packItems;
        const categories = uniqueById(
          members.flatMap((it) => it.product.categories.map((pc) => pc.category))
        );
        const occasions = uniqueById(
          members
            .flatMap((it) => it.product.occasions.map((po) => po.occasion))
            .filter((o) => !o.isCollection)
            .map((o) => ({ id: o.id, name: o.name }))
        );
        const brands = Array.from(
          new Set(members.map((it) => it.product.brand).filter((b): b is string => Boolean(b)))
        );
        const recipients = Array.from(
          new Set(members.flatMap((it) => it.product.recipientTags).filter(Boolean))
        );
        return {
          id: pack.id,
          name: pack.name,
          slug: pack.slug,
          description: pack.descriptionLong,
          descriptionShort: pack.descriptionShort,
          image: pack.images[0]?.url ?? null,
          gradient: null,
          productCount: members.length,
          fromPrice: members.reduce((sum, it) => {
            const bestTier = it.product.priceTiers[0];
            return sum + (bestTier ? Number(bestTier.sellPrice) : 0) * it.quantity;
          }, 0),
          productImages: members.map((it) => it.product.images[0]?.url ?? null),
          productIds: members.map((it) => it.productId),
          categories,
          brands,
          occasions,
          recipients,
        };
      }),
      // A GiftCollection has no views of its own — it is browsed through its
      // packs — so its popularity is the total views of the packs inside it.
      views: c.packProducts.reduce((sum, p) => sum + p.viewCount, 0),
      sortOrder: c.sortOrder,
    }))
    .filter((c) => c.packs.length > 0)
    // Admin `sortOrder` leads; the most-viewed collections lead within a band.
    .sort((a, b) => a.sortOrder - b.sortOrder || b.views - a.views);
}

// Tiles for one level of the collection tree: pass `null` for the top-level
// hub (/curated-packs), or a parent's id for its sub-collections
// (/curated-packs/<parent>). `childCount` tells the caller whether clicking a
// tile lands on more sub-collections or straight on the packs.
export async function getCollectionTiles(parentId: string | null = null) {
  const rows = await prisma.giftCollection.findMany({
    where: { isActive: true, parentId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      image: true,
      gradient: true,
      // The pack count shown on a tile: its own packs plus every pack sitting
      // one level down, so a parent tile isn't misreported as empty.
      packProducts: { where: { isPack: true, status: 'active' }, select: { id: true } },
      children: {
        where: { isActive: true },
        select: {
          id: true,
          packProducts: { where: { isPack: true, status: 'active' }, select: { id: true } },
        },
      },
      // Grandchildren don't exist (the tree is capped at two levels), but a
      // sub-collection still reports its own count of zero honestly.
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  return rows
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      image: c.image,
      gradient: c.gradient,
      childCount: c.children.length,
      packCount:
        c.packProducts.length + c.children.reduce((sum, ch) => sum + ch.packProducts.length, 0),
    }))
    // Hide only a truly empty leaf. A collection that holds sub-collections
    // stays visible even at zero packs — it is a real destination the admin
    // built, and its sub-collections are what the customer came to browse.
    .filter((c) => c.packCount > 0 || c.childCount > 0);
}
