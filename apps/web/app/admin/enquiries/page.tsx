import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { EnquiriesUnifiedTable } from '@/components/admin/enquiries/enquiries-unified-table';

export const revalidate = 0;

export default async function AdminEnquiriesPage() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const enquiries = await prisma.enquiry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const data = enquiries.map((e) => ({
    id: e.id,
    companyName: e.companyName,
    contactName: e.contactName,
    email: e.email,
    phone: e.phone,
    quantity: e.quantity,
    message: e.message,
    productName: e.productName,
    status: e.status,
    createdAt: e.createdAt.toISOString(),
  }));

  const newCount = data.filter((e) => e.status === 'new').length;

  // Deck downloads share this screen as a tab — same lead pool, different signal.
  const proposalDownloads = await prisma.proposalDownload.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const downloads = proposalDownloads.map((d) => ({
    id: d.id,
    name: d.name,
    email: d.email,
    phone: d.phone,
    company: d.company,
    isAccount: !!d.userId,
    quoteToken: d.quoteToken,
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="border-b border-bdr pb-6">
        <h1 className="text-4xl font-normal tracking-tight text-ink">Enquiries</h1>
        <p className="mt-2 text-sm text-ink-2">
          All leads in one place — website enquiries and GoHighLevel, with proposals sent right from the row
          {newCount > 0 && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {newCount} new
            </span>
          )}
        </p>
      </div>

      <EnquiriesUnifiedTable initialData={data} downloads={downloads} />
    </div>
  );
}
