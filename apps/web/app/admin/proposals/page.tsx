import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { ProposalsTable } from '@/components/admin/proposals/proposals-table';

export const revalidate = 0;

export default async function AdminProposalsPage() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const proposals = await prisma.proposal.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      quote: { select: { shareToken: true, status: true, expiresAt: true, payload: true } },
    },
  });

  const data = proposals.map((p) => {
    const payload = p.quote.payload as any;
    return {
      id: p.id,
      recipientEmail: p.recipientEmail,
      recipientName: p.recipientName,
      companyName: p.companyName,
      createdAt: p.createdAt.toISOString(),
      shareToken: p.quote.shareToken,
      quoteStatus: p.quote.status as string,
      expiresAt: p.quote.expiresAt.toISOString(),
      grandTotal: Number(payload?.pricing?.grandTotal) || 0,
      productCount: Array.isArray(payload?.products) ? payload.products.length : 0,
      packQuantity: Number(payload?.packQuantity) || 0,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-bdr pb-6">
        <div>
          <h1 className="text-4xl font-normal tracking-tight text-ink">Proposals</h1>
          <p className="mt-2 text-sm text-ink-2">
            Gift pack proposals sent to leads by email
          </p>
        </div>
        <Link
          href="/admin/proposals/new"
          className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" /> New Proposal
        </Link>
      </div>

      <ProposalsTable initialData={data} />
    </div>
  );
}
