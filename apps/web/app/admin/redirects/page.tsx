import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { RedirectsManager } from '@/components/admin/redirects/redirects-manager';

export const dynamic = 'force-dynamic';

export default async function AdminRedirectsPage() {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const rows = await prisma.urlRedirect.findMany({
    orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
  });

  return (
    <RedirectsManager
      redirects={rows.map((r) => ({
        id: r.id,
        source: r.source,
        destination: r.destination,
        statusCode: r.statusCode,
        isActive: r.isActive,
        note: r.note,
        updatedAt: r.updatedAt.toISOString(),
      }))}
    />
  );
}
