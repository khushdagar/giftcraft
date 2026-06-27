import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { OccasionForm } from '@/components/admin/occasions/occasion-form';
import { OccasionProductManager } from '@/components/admin/occasions/occasion-product-manager';
import Link from 'next/link';

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
    <div className="space-y-8">
      <div className="max-w-2xl">
        <Link href="/admin/occasions" className="text-em hover:underline text-sm font-medium">
          ← Back to Occasions
        </Link>
        <h1 className="text-3xl font-normal tracking-tight text-ink mt-4">Edit Occasion</h1>
        <p className="text-sm text-ink-2 mt-2">{occasion.name}</p>
      </div>

      <div className="max-w-2xl">
        <OccasionForm mode="edit" occasion={occasion} />
      </div>

      {/* Product Manager */}
      <div>
        <OccasionProductManager
          occasionId={occasion.id}
          occasionName={occasion.name}
          linkedProducts={occasion.products}
        />
      </div>
    </div>
  );
}
