import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// Who downloaded a proposal deck from checkout — account holders are logged
// automatically; guests appear via the lead-capture dialog.
export default async function ProposalDownloadsPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'super_admin') {
    redirect('/unauthorized');
  }

  const downloads = await prisma.proposalDownload.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-normal text-ink">Deck Downloads</h1>
        <p className="text-sm text-ink-3 mt-1">
          Everyone who downloaded a proposal deck from checkout — logged-in
          customers and captured guest leads.
        </p>
      </div>

      <div className="rounded-md border-2 border-bdr bg-white p-5">
        {downloads.length === 0 ? (
          <p className="text-sm text-ink-3">
            No downloads yet. They&apos;ll appear here as soon as someone
            downloads a proposal deck.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bdr">
                  <th className="py-2 pr-4 text-left font-normal text-ink">Name</th>
                  <th className="py-2 pr-4 text-left font-normal text-ink">Email</th>
                  <th className="py-2 pr-4 text-left font-normal text-ink">Phone</th>
                  <th className="py-2 pr-4 text-left font-normal text-ink">Company</th>
                  <th className="py-2 pr-4 text-left font-normal text-ink">Type</th>
                  <th className="py-2 pr-4 text-left font-normal text-ink">Quote</th>
                  <th className="py-2 text-left font-normal text-ink">Downloaded</th>
                </tr>
              </thead>
              <tbody>
                {downloads.map((d) => (
                  <tr key={d.id} className="border-b border-bdr last:border-0">
                    <td className="py-3 pr-4 font-normal text-ink">{d.name}</td>
                    <td className="py-3 pr-4 text-ink-2">{d.email}</td>
                    <td className="py-3 pr-4 text-ink-2">{d.phone || '—'}</td>
                    <td className="py-3 pr-4 text-ink-2">{d.company || '—'}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-normal ${
                          d.userId
                            ? 'bg-em-50 text-em-700'
                            : 'bg-gold-50 text-gold-700'
                        }`}
                      >
                        {d.userId ? 'Account' : 'Guest lead'}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <Link
                        href={`/quote/${d.quoteToken}`}
                        target="_blank"
                        className="text-em hover:underline"
                      >
                        View quote
                      </Link>
                    </td>
                    <td className="py-3 text-ink-2 whitespace-nowrap">
                      {new Date(d.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
