import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const revalidate = 60;

export default async function AdminVendorsPage() {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const vendors = await prisma.vendor.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      score: true,
      priceConfirmedAt: true,
      createdAt: true,
    },
    orderBy: { name: 'asc' },
  });

  const getScoreBadgeColor = (score: number | null) => {
    if (score === null) return 'bg-recessed text-ink-2';
    if (score >= 80) return 'bg-em-50 text-em-700';
    if (score >= 50) return 'bg-amber-50 text-amber-700';
    return 'bg-err/10 text-err';
  };

  const isPriceConfirmed = (priceConfirmedAt: Date | null) => {
    if (!priceConfirmedAt) return false;
    const daysSince = Math.floor(
      (new Date().getTime() - priceConfirmedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSince <= 90;
  };

  return (
    <>
      <div className="mb-8 border-b border-bdr pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-ink">Vendors</h1>
            <p className="mt-1 text-sm text-ink-2">{vendors.length} vendors total</p>
          </div>
          <Button asChild className="rounded-2xl bg-em px-6 py-2 font-bold hover:bg-em-600">
            <Link href="/admin/vendors/new">+ New Vendor</Link>
          </Button>
        </div>
      </div>

      <div className="border border-bdr rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-elevated border-b border-bdr">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-ink-2 uppercase">Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-ink-2 uppercase">Email</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-ink-2 uppercase">Score</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-ink-2 uppercase">Price Status</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-ink-2 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bdr">
            {vendors.map((vendor) => (
              <tr key={vendor.id} className="hover:bg-canvas">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-ink">{vendor.name}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-ink-2">{vendor.email}</p>
                </td>
                <td className="px-6 py-4">
                  {vendor.score ? (
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getScoreBadgeColor(Number(vendor.score))}`}>
                      {Number(vendor.score).toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-sm text-ink-2">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {isPriceConfirmed(vendor.priceConfirmedAt) ? (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-em-50 text-em-700">
                      Confirmed
                    </span>
                  ) : (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                      Needs Update
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/vendors/${vendor.id}`}>View</Link>
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
