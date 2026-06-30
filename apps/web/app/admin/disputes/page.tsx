import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/prisma';

export const revalidate = 60;

export default async function AdminDisputesPage() {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const disputes = await prisma.disputeTicket.findMany({
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
          company: {
            select: { name: true },
          },
        },
      },
      submittedBy: {
        select: {
          id: true,
          name: true,
          email: true,
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

  const isExpired = (expiresAt: Date) => {
    return new Date() > expiresAt;
  };

  return (
    <>
      <div className="mb-8 border-b border-bdr pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-normal tracking-tight text-ink">Disputes</h1>
            <p className="mt-1 text-sm text-ink-2">{disputes.length} disputes total</p>
          </div>
        </div>
      </div>

      <div className="border border-bdr rounded-lg overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-elevated border-b border-bdr">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Order</th>
              <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Subject</th>
              <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Status</th>
              <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Window</th>
              <th className="px-6 py-4 text-right text-xs font-normal text-ink-2 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bdr">
            {disputes.map((dispute) => (
              <tr key={dispute.id} className="hover:bg-canvas">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-ink">{dispute.order.company?.name || 'Unknown'}</p>
                    <p className="text-xs text-ink-2">{dispute.order.orderNumber}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-ink max-w-xs truncate">{dispute.subject}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-normal ${statusColors[dispute.status]}`}>
                    {dispute.status.replace('_', ' ').charAt(0).toUpperCase() + dispute.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-normal ${isExpired(dispute.windowExpiresAt) ? 'text-err' : 'text-em-700'}`}>
                    {isExpired(dispute.windowExpiresAt) ? 'Expired' : new Date(dispute.windowExpiresAt).toLocaleDateString('en-IN')}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Button asChild variant="outline" size="sm" className="rounded-2xl">
                    <Link href={`/admin/disputes/${dispute.id}`}>View</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
