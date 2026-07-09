import { auth } from '@/auth';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { serializeProduct } from '@/lib/serialize';
import { ProductForm } from '@/components/admin/products/product-form';

export const revalidate = 3600;

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      priceTiers: { orderBy: { tier: 'asc' } },
      images: { orderBy: { sortOrder: 'asc' } },
      hsn: { include: { hsn: true } },
      categories: { include: { category: true } },
      occasions: { include: { occasion: true } },
      variants: { orderBy: { sortOrder: 'asc' } },
      vendors: { include: { vendor: true } },
      // Pack member products (only present when this product is a pack).
      packItems: {
        orderBy: { sortOrder: 'asc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              brand: true,
              weightG: true,
              leadTimeDays: true,
              moq: true,
              dimensionL: true,
              dimensionW: true,
              dimensionH: true,
              images: { orderBy: { sortOrder: 'asc' }, take: 1 },
              priceTiers: {
                orderBy: { tier: 'asc' },
                select: { minQty: true, maxQty: true, sellPrice: true },
              },
            },
          },
        },
      },
    },
  });

  if (!product) {
    notFound();
  }

  const serialized = serializeProduct(product);

  // Surface pack fields onto initialData so the form can pre-fill them.
  const initialData = {
    ...serialized,
    isPack: product.isPack,
    packCollectionId: product.packCollectionId,
    packItems: product.packItems.map((it) => ({
      productId: it.product.id,
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
  };

  return (
    <div className="min-h-screen">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-normal text-gray-900">
          {product.isPack ? 'Edit Curated Pack' : 'Edit Product'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{product.name}</p>
      </div>

      <div className="py-12">
        <ProductForm mode="edit" isPack={product.isPack} initialData={initialData} />
      </div>
    </div>
  );
}
