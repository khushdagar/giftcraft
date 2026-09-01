import { auth } from '@/auth';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
  CatalogueBuilder,
  type EditorCatalogue,
} from '@/components/admin/catalogues/catalogue-builder';

export const dynamic = 'force-dynamic';

export default async function EditCataloguePage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const catalogue = await prisma.catalogue.findUnique({
    where: { id: params.id },
    include: {
      sections: {
        orderBy: { sortOrder: 'asc' },
        include: {
          items: {
            orderBy: { sortOrder: 'asc' },
            include: {
              product: {
                select: {
                  name: true,
                  sku: true,
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
      },
    },
  });
  if (!catalogue) notFound();

  const initial: EditorCatalogue = {
    id: catalogue.id,
    title: catalogue.title,
    slug: catalogue.slug,
    closingNote: catalogue.closingNote,
    coverImageUrl: catalogue.coverImageUrl,
    closingImageUrl: catalogue.closingImageUrl,
    theme: catalogue.theme,
    priceMode: catalogue.priceMode,
    showSku: catalogue.showSku,
    showMoq: catalogue.showMoq,
    sections: catalogue.sections.map((s) => ({
      title: s.title,
      mode: s.mode,
      categoryId: s.categoryId,
      includeChildren: s.includeChildren,
      maxProducts: s.maxProducts,
      items: s.items.map((i) => ({
        productId: i.productId,
        badge: i.badge,
        name: i.product.name,
        sku: i.product.sku,
        imageUrl: i.product.images[0]?.url ?? null,
      })),
    })),
  };

  return <CatalogueBuilder initial={initial} />;
}
