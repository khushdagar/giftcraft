import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { GiftPackForm } from '@/components/admin/gift-packs/gift-pack-form';

export const dynamic = 'force-dynamic';

export default async function EditGiftPackPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const pack = await prisma.giftPack.findUnique({
    where: { id: params.id },
    include: {
      items: {
        orderBy: { sortOrder: 'asc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              brand: true,
              images: { orderBy: { sortOrder: 'asc' }, take: 1 },
              priceTiers: {
                orderBy: { tier: 'asc' },
                select: { minQty: true, maxQty: true, sellPrice: true },
              },
            },
          },
        },
      },
      categories: { select: { categoryId: true } },
    },
  });

  if (!pack) {
    notFound();
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <Link href="/admin/products?view=packs" className="text-em hover:underline text-sm font-medium">
          ← Back to Curated Packs
        </Link>
        <h1 className="text-3xl font-normal tracking-tight text-ink mt-4">Edit Curated Pack</h1>
        <p className="text-sm text-ink-2 mt-2">Update the pack details and products</p>
      </div>

      <GiftPackForm
        mode="edit"
        collectionId={pack.collectionId}
        pack={{
          id: pack.id,
          name: pack.name,
          slug: pack.slug,
          descriptionShort: pack.descriptionShort,
          description: pack.description,
          image: pack.image,
          gradient: pack.gradient,
          isActive: pack.isActive,
          isFeatured: pack.isFeatured,
          sortOrder: pack.sortOrder,
          items: pack.items.map((it) => ({
            productId: it.productId,
            name: it.product.name,
            brand: it.product.brand,
            imageUrl: it.product.images[0]?.url ?? null,
            quantity: it.quantity,
            priceTiers: it.product.priceTiers.map((t) => ({
              minQty: t.minQty,
              maxQty: t.maxQty,
              sellPrice: Number(t.sellPrice),
            })),
          })),
          categoryIds: pack.categories.map((c) => c.categoryId),
        }}
      />
    </div>
  );
}
