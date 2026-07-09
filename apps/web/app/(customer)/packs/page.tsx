import { prisma } from '@/lib/prisma';
import { PacksBrowser } from '@/components/packs/packs-browser';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Curated Packs | GiftCraft',
  description:
    'Hand-picked gift assortments curated by our gifting experts. Ready to customise with your branding.',
};

function uniqueById(list: { id: string; name: string }[]) {
  const map = new Map<string, { id: string; name: string }>();
  for (const item of list) map.set(item.id, item);
  return Array.from(map.values());
}

export default async function PacksPage() {
  const collections = await prisma.giftCollection.findMany({
    where: { isActive: true },
    include: {
      packProducts: {
        where: { isPack: true, status: 'active' },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
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
                  priceTiers: { where: { tier: 1 }, select: { sellPrice: true } },
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

  const data = collections
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
            const tier1 = it.product.priceTiers[0];
            return sum + (tier1 ? Number(tier1.sellPrice) : 0) * it.quantity;
          }, 0),
          productImages: members.map((it) => it.product.images[0]?.url ?? null),
          productIds: members.map((it) => it.productId),
          categories,
          brands,
          occasions,
          recipients,
        };
      }),
    }))
    .filter((c) => c.packs.length > 0);

  return <PacksBrowser collections={data} />;
}
