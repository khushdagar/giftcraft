import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { OccasionList } from '@/components/admin/occasions/occasion-list';

export const dynamic = 'force-dynamic';

export default async function AdminOccasionsPage() {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const occasions = await prisma.occasionConfig.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      isActive: true,
      isCollection: true,
      _count: { select: { products: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });

  return <OccasionList occasions={occasions} />;
}
