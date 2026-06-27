import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/prisma';

export const revalidate = 60;

export default async function DisputesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true },
  });

  if (!user?.companyId) {
    redirect('/dashboard');
  }

  const disputes = await prisma.disputeTicket.findMany({
    where: {
      order: {
        companyId: user.companyId,
      },
    },
    select: {
      id: true,
      subject: true,
      status: true,
      windowExpiresAt: true,
      createdAt: true,
      order: {
        select: {
          id: true,
          orderNumber: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const statusColors: Record<string, string> = {
    open: 'bg-sky-50 text-sky-700',
    under_review: 'bg-amber-50 text-amber-700',
    resolved: 'bg-em-50 text-em-700',
    closed: 'bg-recessed text-ink-2',
  };

  return (
    <div>
      <div className="mb-8 border-b border-bdr pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-normal tracking-tight text-ink">Disputes</h1>
            <p className="mt-1 text-sm text-ink-2">Track and manage order disputes</p>
          </div>
          <Button asChild className="rounded-2xl bg-em px-6 py-2 font-normal hover:bg-em-600">
            <Link href="/dashboard/disputes/new">+ File Dispute</Link>
          </Button>
        </div>
      </div>

      {disputes.length === 0 ? (
        <div className="border border-bdr rounded-lg p-8 text-center">
          <p className="text-ink-2 mb-4">No disputes yet</p>
          <Button asChild className="rounded-2xl bg-em px-6 font-normal">
            <Link href="/dashboard/disputes/new">File Your First Dispute</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map((dispute) => (
            <Link
              key={dispute.id}
              href={`/dashboard/disputes/${dispute.id}`}
              className="block border border-bdr rounded-lg p-4 hover:bg-canvas transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-normal text-ink">{dispute.subject}</p>
                  <p className="text-xs text-ink-2 mt-1">Order {dispute.order.orderNumber}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-normal ${statusColors[dispute.status]}`}>
                    {dispute.status.replace('_', ' ').charAt(0).toUpperCase() + dispute.status.slice(1)}
                  </span>
                  <p className="text-xs text-ink-2 mt-2">{new Date(dispute.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
