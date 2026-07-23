import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/prisma';

// Per-user data — must render per request, never cache across users.
export const dynamic = 'force-dynamic';

export default async function DisputeDetailPage({
  params,
}: {
  params: { id: string };
}) {
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
      order: {
        select: {
          id: true,
          orderNumber: true,
          companyId: true,
        },
      },
    },
  });

  if (!dispute || dispute.order.companyId !== user.companyId) {
    redirect('/dashboard/disputes');
  }

  const statusColors: Record<string, string> = {
    open: 'bg-sky-50 text-sky-700',
    under_review: 'bg-amber-50 text-amber-700',
    resolved: 'bg-em-50 text-em-700',
    closed: 'bg-recessed text-ink-2',
  };

  const statusDescriptions: Record<string, string> = {
    open: 'Your dispute has been received. Our team will review it shortly.',
    under_review: 'Our team is actively reviewing your dispute.',
    resolved: 'Your dispute has been resolved.',
    closed: 'Your dispute has been closed.',
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div className="border-b border-bdr pb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-normal tracking-tight text-ink">{dispute.subject}</h1>
            <p className="mt-2 text-sm text-ink-2">Order {dispute.order.orderNumber}</p>
          </div>
          <span className={`inline-block px-4 py-2 rounded-full text-sm font-normal ${statusColors[dispute.status]}`}>
            {dispute.status.replace('_', ' ').charAt(0).toUpperCase() + dispute.status.slice(1)}
          </span>
        </div>
      </div>

      <div className="bg-canvas border border-bdr rounded-lg p-6">
        <p className="text-sm text-ink mb-2">{statusDescriptions[dispute.status]}</p>
        <p className="text-xs text-ink-2">
          Filed on {new Date(dispute.createdAt).toLocaleDateString('en-IN')}
        </p>
      </div>

      <div className="border border-bdr rounded-lg p-6">
        <h3 className="text-lg font-normal text-ink mb-4">Issue Details</h3>
        <p className="text-sm text-ink whitespace-pre-wrap">{dispute.body}</p>

        {dispute.photoUrls.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-normal text-ink mb-3">Photos ({dispute.photoUrls.length})</p>
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

      {dispute.resolutionNote && (
        <div className="border border-em-200 bg-em-50 rounded-lg p-6">
          <h3 className="text-lg font-normal text-em-700 mb-3">Resolution</h3>
          <p className="text-sm text-em-700 whitespace-pre-wrap">{dispute.resolutionNote}</p>
          {dispute.resolvedAt && (
            <p className="text-xs text-em-600 mt-3">
              Resolved on {new Date(dispute.resolvedAt).toLocaleDateString('en-IN')}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Button asChild variant="outline" className="rounded-2xl">
          <Link href="/dashboard/disputes">Back to Disputes</Link>
        </Button>
      </div>
    </div>
  );
}
