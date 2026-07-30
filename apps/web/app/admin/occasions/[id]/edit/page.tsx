import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { OccasionForm } from '@/components/admin/occasions/occasion-form';
import { OccasionProductManager } from '@/components/admin/occasions/occasion-product-manager';

export default async function EditOccasionPage({ params }: { params: { id: string } }) {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const occasion = await prisma.occasionConfig.findUnique({
    where: { id: params.id },
    include: {
      products: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              brand: true,
              images: { select: { url: true, isPrimary: true }, take: 1 },
            },
          },
        },
      },
    },
  });

  if (!occasion) {
    redirect('/admin/occasions');
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <OccasionForm mode="edit" occasion={occasion} />

      {/* Product Manager */}
      <OccasionProductManager
        occasionId={occasion.id}
        occasionName={occasion.name}
        linkedProducts={occasion.products}
      />
    </div>
  );
}
