import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Users, Plus, Upload } from 'lucide-react';
import { VendorActiveToggle } from './vendor-active-toggle';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  to_approach: 'To Approach',
  onboarding: 'Onboarding',
  onboarded: 'Onboarded',
};

export const metadata = {
  title: 'Vendors - GIVOO Admin',
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
      type: true,
      email: true,
      phone: true,
      city: true,
      onboardingStatus: true,
      isActive: true,
      source: true,
      vendorScore: { select: { qualityScore: true } },
      _count: { select: { pos: true } },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-normal text-ink">Vendors</h1>
          <p className="text-sm text-ink-2 mt-1">Total: {vendors.length} vendor{vendors.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/vendors/bulk"
            className="inline-flex items-center gap-2 rounded-md border-2 border-bdr bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" /> Bulk Import
          </Link>
          <Link
            href="/admin/vendors/new"
            className="inline-flex items-center gap-2 rounded-md bg-em px-4 py-2.5 text-sm font-medium text-white transition hover:bg-em-600"
          >
            <Plus className="h-4 w-4" /> Create Vendor
          </Link>
        </div>
      </div>

      {vendors.length === 0 ? (
        <div className="rounded-md border-2 border-bdr bg-white p-12 text-center">
          <Users className="w-12 h-12 text-ink-3 mx-auto mb-4 opacity-50" />
          <p className="text-ink-2 mb-5">No vendors registered</p>
          <Link
            href="/admin/vendors/new"
            className="inline-flex items-center gap-2 rounded-md bg-em px-4 py-2.5 text-sm font-medium text-white transition hover:bg-em-600"
          >
            <Plus className="h-4 w-4" /> Create Vendor
          </Link>
        </div>
      ) : (
        <div className="rounded-md border-2 border-bdr overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="bg-gray-50 border-b-2 border-bdr">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Name</th>
                <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Type</th>
                <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Email</th>
                <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">Location</th>
                <th className="px-6 py-4 text-center text-xs font-normal text-ink-2 uppercase">Onboarding</th>
                <th className="px-6 py-4 text-center text-xs font-normal text-ink-2 uppercase">Active</th>
                <th className="px-6 py-4 text-center text-xs font-normal text-ink-2 uppercase">POs</th>
                <th className="px-6 py-4 text-center text-xs font-normal text-ink-2 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bdr">
              {vendors.map((vendor) => (
                <tr key={vendor.id} className={`hover:bg-gray-50 ${vendor.isActive ? '' : 'opacity-60'}`}>
                  <td className="px-6 py-4 text-sm font-normal text-ink">
                    {vendor.name}
                    {vendor.source === 'self_registration' && (
                      <span className="ml-2 rounded-full bg-gold-50 px-2 py-0.5 text-[10px] font-medium text-gold-700">
                        Applied
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-2">{vendor.type || '—'}</td>
                  <td className="px-6 py-4 text-sm text-ink-2 break-all">{vendor.email || '—'}</td>
                  <td className="px-6 py-4 text-sm text-ink-2">{vendor.city || '—'}</td>
                  <td className="px-6 py-4 text-center text-sm text-ink-2">
                    {STATUS_LABELS[vendor.onboardingStatus] || vendor.onboardingStatus || '—'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <VendorActiveToggle vendorId={vendor.id} initialActive={vendor.isActive} />
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-normal text-ink">
                    {vendor._count.pos}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Link
                      href={`/admin/vendors/${vendor.id}`}
                      className="text-em hover:underline font-normal text-sm"
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
