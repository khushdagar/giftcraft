import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { SampleStatusUpdater } from './components/sample-status-updater';

export const revalidate = 60;

const statusColors: Record<string, string> = {
  requested: 'bg-amber-50 text-amber-700',
  approved: 'bg-sky-50 text-sky-700',
  shipped: 'bg-em-50 text-em-700',
  rejected: 'bg-recessed text-ink-2',
};

export default async function AdminSamplesPage() {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const samples = await prisma.sampleOrder.findMany({
    include: {
      product: { select: { id: true, name: true, slug: true } },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <>
      <div className="mb-8 border-b border-bdr pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-normal tracking-tight text-ink">Samples</h1>
            <p className="mt-1 text-sm text-ink-2">{samples.length} sample requests total</p>
          </div>
        </div>
      </div>

      <div className="border border-bdr rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-elevated border-b border-bdr">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Product</th>
              <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Requested By</th>
              <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Status</th>
              <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Requested</th>
              <th className="px-6 py-4 text-right text-xs font-normal text-ink-2 uppercase">Update Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bdr">
            {samples.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-ink-2">
                  No sample requests yet. They appear here when a customer requests a product sample.
                </td>
              </tr>
            )}
            {samples.map((sample) => (
              <tr key={sample.id} className="hover:bg-canvas">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-ink">{sample.product.name}</p>
                  {sample.notes && (
                    <p className="text-xs text-ink-2 max-w-xs truncate">{sample.notes}</p>
                  )}
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-ink">{sample.user?.name || 'Guest'}</p>
                  <p className="text-xs text-ink-2">{sample.user?.email || 'N/A'}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-normal capitalize ${statusColors[sample.status] || 'bg-recessed text-ink-2'}`}>
                    {sample.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-ink-2">
                    {new Date(sample.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end">
                    <SampleStatusUpdater sampleId={sample.id} currentStatus={sample.status} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
