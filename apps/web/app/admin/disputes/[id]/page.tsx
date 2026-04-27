import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { DisputeStatusUpdater } from './components/dispute-status-updater';

export const revalidate = 60;

export default async function DisputeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const dispute = await prisma.disputeTicket.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      subject: true,
      body: true,
      photoUrls: true,
      status: true,
      resolutionNote: true,
      resolvedAt: true,
      windowExpiresAt: true,
      createdAt: true,
      updatedAt: true,
      order: {
        select: {
          id: true,
          orderNumber: true,
          company: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
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
  });

  if (!dispute) {
    redirect('/admin/disputes');
  }

  const statusColors: Record<string, string> = {
    open: 'bg-sky-50 text-sky-700',
    under_review: 'bg-amber-50 text-amber-700',
    resolved: 'bg-em-50 text-em-700',
    closed: 'bg-recessed text-ink-2',
  };

  const isExpired = new Date() > dispute.windowExpiresAt;

  return (
    <div className="max-w-4xl space-y-8">
      <div className="border-b border-bdr pb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-ink">{dispute.subject}</h1>
            <p className="mt-2 text-sm text-ink-2">
              Order: <span className="font-semibold">{dispute.order.orderNumber}</span> • {dispute.order.company?.name || 'Unknown Company'}
            </p>
          </div>
          <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${statusColors[dispute.status]}`}>
            {dispute.status.replace('_', ' ').charAt(0).toUpperCase() + dispute.status.slice(1)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="border border-bdr rounded-lg p-4">
          <p className="text-xs font-semibold text-ink-2 uppercase mb-1">Submitted By</p>
          <p className="text-sm font-medium text-ink">{dispute.submittedBy?.name || 'Unknown'}</p>
          <p className="text-xs text-ink-2">{dispute.submittedBy?.email}</p>
        </div>
        <div className="border border-bdr rounded-lg p-4">
          <p className="text-xs font-semibold text-ink-2 uppercase mb-1">Submitted</p>
          <p className="text-sm font-medium text-ink">{new Date(dispute.createdAt).toLocaleDateString('en-IN')}</p>
          <p className="text-xs text-ink-2">{new Date(dispute.createdAt).toLocaleTimeString('en-IN')}</p>
        </div>
        <div className="border border-bdr rounded-lg p-4">
          <p className="text-xs font-semibold text-ink-2 uppercase mb-1">Resolution Window</p>
          <p className={`text-sm font-medium ${isExpired ? 'text-err' : 'text-em-700'}`}>
            {isExpired ? 'Expired' : new Date(dispute.windowExpiresAt).toLocaleDateString('en-IN')}
          </p>
        </div>
      </div>

      <div className="border border-bdr rounded-lg p-6">
        <h3 className="text-lg font-bold text-ink mb-4">Issue Details</h3>
        <p className="text-sm text-ink whitespace-pre-wrap">{dispute.body}</p>

        {dispute.photoUrls.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-semibold text-ink mb-3">Photos ({dispute.photoUrls.length})</p>
            <div className="grid grid-cols-3 gap-4">
              {dispute.photoUrls.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border border-bdr rounded-lg overflow-hidden hover:opacity-75"
                >
                  <img src={url} alt={`Dispute photo ${idx + 1}`} className="w-full h-40 object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <DisputeStatusUpdater
        disputeId={dispute.id}
        currentStatus={dispute.status}
        currentResolutionNote={dispute.resolutionNote}
      />
    </div>
  );
}
