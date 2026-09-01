import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CatalogueList } from '@/components/admin/catalogues/catalogue-list';

export const dynamic = 'force-dynamic';

/**
 * /admin/catalogues — every PDF catalogue, newest first.
 */
export default async function AdminCataloguesPage() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const catalogues = await prisma.catalogue.findMany({
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      theme: true,
      updatedAt: true,
      sections: { select: { mode: true, _count: { select: { items: true } } } },
    },
  });

  const rows = catalogues.map((c) => ({
    id: c.id,
    title: c.title,
    theme: c.theme,
    updatedAt: c.updatedAt.toISOString(),
    sectionCount: c.sections.length,
    categorySections: c.sections.filter((s) => s.mode === 'category').length,
    pickedProducts: c.sections.reduce((n, s) => n + s._count.items, 0),
  }));

  return <CatalogueList rows={rows} />;
}
