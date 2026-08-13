import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { SavedPacksManager } from '@/components/dashboard/saved-packs-manager';

export default async function SavedPacksPage() {
  const session = await auth();
  // The dashboard layout already redirects unauthenticated visitors; this is
  // just a type guard so session.user.id is non-null below.
  if (!session?.user?.id) return null;

  const packs = await prisma.savedPack.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      items: {
        orderBy: { sortOrder: 'asc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              images: {
                orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                take: 1,
                select: { url: true },
              },
            },
          },
        },
      },
    },
  });

  const serialized = packs.map((pack) => ({
    id: pack.id,
    name: pack.name,
    packQuantity: pack.packQuantity,
    updatedAt: pack.updatedAt.toISOString(),
    items: pack.items.map((it) => ({
      productId: it.productId,
      variants: (it.variants as Array<{ kind: string; value: string }> | null) ?? [],
      name: it.product.name,
      slug: it.product.slug,
      active: it.product.status === 'active',
      image: it.product.images[0]?.url ?? null,
    })),
  }));

  return (
    <div className="max-w-full">
      <div className="mb-8 border-b border-bdr pb-8">
        <h1 className="text-3xl font-normal tracking-tight text-ink">Saved Packs</h1>
        <p className="mt-1 text-sm text-ink-2">
          Gift pack configurations you saved from the builder — reorder any of them in one click.
        </p>
      </div>

      <SavedPacksManager packs={serialized} />
    </div>
  );
}
