import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PageSeoManager } from '@/components/admin/seo/page-seo-manager';

export const dynamic = 'force-dynamic';

export default async function AdminSeoPage() {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const rows = await prisma.pageSeo.findMany({ orderBy: { path: 'asc' } });

  return (
    <PageSeoManager
      entries={rows.map((r) => ({
        id: r.id,
        path: r.path,
        metaTitle: r.metaTitle,
        metaDescription: r.metaDescription,
        canonicalUrl: r.canonicalUrl,
        ogTitle: r.ogTitle,
        ogDescription: r.ogDescription,
        ogImageUrl: r.ogImageUrl,
        noIndex: r.noIndex,
        noFollow: r.noFollow,
        updatedAt: r.updatedAt.toISOString(),
      }))}
    />
  );
}
