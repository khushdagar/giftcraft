import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { NotifiedToggle } from '@/components/admin/restock-requests/notified-toggle';

export const revalidate = 0;

export default async function AdminRestockRequestsPage() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const requests = await prisma.restockRequest.findMany({
    orderBy: [{ notified: 'asc' }, { createdAt: 'desc' }],
  });

  return (
    <>
      <div className="mb-8 border-b border-bdr pb-8">
        <h1 className="text-3xl font-normal tracking-tight text-ink">Restock Requests</h1>
        <p className="mt-1 text-sm text-ink-2">
          {requests.length} customers waiting to hear about an out-of-stock pack item
        </p>
      </div>

      <div className="border border-bdr rounded-lg overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-elevated border-b border-bdr">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Product</th>
              <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Contact</th>
              <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Requested</th>
              <th className="px-6 py-4 text-right text-xs font-normal text-ink-2 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bdr">
            {requests.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-ink-2">
                  No restock requests yet. They appear here when a customer asks to be notified about
                  an out-of-stock pack item.
                </td>
              </tr>
            )}
            {requests.map((r) => (
              <tr key={r.id} className="hover:bg-canvas">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-ink">{r.productName}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-ink">{r.email}</p>
                  {r.phone && <p className="text-xs text-ink-2">{r.phone}</p>}
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-ink-2">
                    {new Date(r.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end">
                    <NotifiedToggle id={r.id} notified={r.notified} />
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
