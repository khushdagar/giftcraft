import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Users } from 'lucide-react';

export const metadata = {
  title: 'Vendors - GiftCraft Admin',
  description: 'Manage vendor accounts',
};

export default async function AdminVendorsPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'super_admin') {
    redirect('/unauthorized');
  }

  const vendors = await prisma.vendor.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      city: true,
      vendorScore: { select: { qualityScore: true } },
      _count: { select: { pos: true } },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-ink">Vendors</h1>
        <p className="text-sm text-ink-2 mt-1">Total: {vendors.length} vendor{vendors.length !== 1 ? 's' : ''}</p>
      </div>

      {vendors.length === 0 ? (
        <div className="rounded-md border-2 border-bdr bg-white p-12 text-center">
          <Users className="w-12 h-12 text-ink-3 mx-auto mb-4 opacity-50" />
          <p className="text-ink-2">No vendors registered</p>
        </div>
      ) : (
        <div className="rounded-md border-2 border-bdr overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-bdr">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-ink-2 uppercase">Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-ink-2 uppercase">Email</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-ink-2 uppercase">Location</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-ink-2 uppercase">POs</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-ink-2 uppercase">Score</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-ink-2 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bdr">
              {vendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-semibold text-ink">{vendor.name}</td>
                  <td className="px-6 py-4 text-sm text-ink-2 break-all">{vendor.email}</td>
                  <td className="px-6 py-4 text-sm text-ink-2">{vendor.city || '—'}</td>
                  <td className="px-6 py-4 text-center text-sm font-semibold text-ink">
                    {vendor._count.pos}
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-semibold text-em">
                    {vendor.vendorScore?.qualityScore || '—'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Link
                      href={`/admin/vendors/${vendor.id}`}
                      className="text-em hover:underline font-semibold text-sm"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
