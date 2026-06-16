import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { formatRupees } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { DisputeTimeline } from '@/components/admin/disputes/dispute-timeline';
import { DisputePhotoGallery } from '@/components/disputes/dispute-photo-gallery';
import { DisputeStatusUpdater } from './components/dispute-status-updater';

export const metadata = {
  title: 'Dispute Details - GiftCraft Admin',
  description: 'View and manage dispute ticket',
};

export default async function DisputeDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || session.user?.role !== 'super_admin') {
    redirect('/unauthorized');
  }

  const dispute = await prisma.disputeTicket.findUnique({
    where: { id: params.id },
    include: {
      order: {
        select: {
          id: true, orderNumber: true, status: true, grandTotal: true, createdAt: true,
          deliveryDate: true,
          company: { select: { id: true, name: true, phone: true, email: true } },
          items: { select: { productId: true, quantity: true, unitPrice: true, totalPrice: true } },
        },
      },
      submittedBy: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  if (!dispute) redirect('/admin/disputes');

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      'open': 'bg-blue-50 text-blue-700 border-blue-200',
      'under_review': 'bg-amber-50 text-amber-700 border-amber-200',
      'resolved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'closed': 'bg-gray-50 text-gray-700 border-gray-200',
    };
    return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getStatusLabel = (status: string) =>
    status.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-ink-3">
        <Link href="/admin/disputes" className="text-em hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Disputes
        </Link>
        <span>/</span>
        <span className="font-semibold text-ink">{dispute.id}</span>
      </div>

      <div>
        <h1 className="text-3xl font-black text-ink">Dispute #{dispute.id.slice(-8).toUpperCase()}</h1>
        <p className="text-sm text-ink-2 mt-1">
          Order {dispute.order.orderNumber} · Filed {new Date(dispute.createdAt).toLocaleDateString('en-IN')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          <div className="rounded-md border-2 border-bdr bg-white p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Status</p>
                <p className={`inline-block mt-2 px-3 py-1.5 rounded-full text-xs font-semibold border-2 ${getStatusBadgeColor(dispute.status)}`}>
                  {getStatusLabel(dispute.status)}
                </p>
              </div>
              <p className="text-xs text-ink-3">
                {new Date(dispute.windowExpiresAt).getTime() > Date.now()
                  ? `Expires in ${Math.ceil((dispute.windowExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days`
                  : 'Window expired'}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">Subject</p>
                <p className="text-base font-semibold text-ink">{dispute.subject}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">Description</p>
                <p className="text-sm text-ink-2 whitespace-pre-wrap">{dispute.body}</p>
              </div>
              {dispute.resolutionNote && (
                <div className="rounded-md bg-emerald-50 border-2 border-emerald-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">Resolution</p>
                  <p className="text-sm text-emerald-700 whitespace-pre-wrap">{dispute.resolutionNote}</p>
                </div>
              )}
            </div>
          </div>

          {dispute.photoUrls.length > 0 && (
            <div className="rounded-md border-2 border-bdr bg-white p-5">
              <DisputePhotoGallery photos={dispute.photoUrls} title="Dispute Evidence" />
            </div>
          )}

          <div className="rounded-md border-2 border-bdr bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-4">Order Details</p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-2">Order</span>
                <Link href={`/admin/orders/${dispute.order.id}`} className="text-em hover:underline font-semibold flex items-center gap-1">
                  {dispute.order.orderNumber} <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-2">Company</span>
                <span className="font-semibold text-ink">{dispute.order.company?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-2">Total</span>
                <span className="font-semibold text-ink tabnum">{formatRupees(Number(dispute.order.grandTotal))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-2">Status</span>
                <span className="font-semibold text-ink">{dispute.order.status.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          {dispute.submittedBy && (
            <div className="rounded-md border-2 border-bdr bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-4">Submitted By</p>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-ink-3 text-xs">Name</p>
                  <p className="font-semibold text-ink">{dispute.submittedBy.name}</p>
                </div>
                <div>
                  <p className="text-ink-3 text-xs">Email</p>
                  <p className="font-semibold text-ink text-xs break-all">{dispute.submittedBy.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-20 lg:h-fit space-y-4">
          <DisputeStatusUpdater disputeId={dispute.id} currentStatus={dispute.status} orderNumber={dispute.order.orderNumber} />
          <div className="rounded-md border-2 border-bdr bg-white p-5">
            <DisputeTimeline currentStatus={dispute.status} createdAt={dispute.createdAt} resolvedAt={dispute.resolvedAt} />
          </div>
        </div>
      </div>
    </div>
  );
}
