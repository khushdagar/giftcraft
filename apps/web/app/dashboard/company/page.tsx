import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';

export const revalidate = 60;

export default async function CompanyPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const company = await prisma.company.findFirst({
    where: {
      users: {
        some: { id: session.user.id },
      },
    },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!company) {
    return (
      <div className="rounded-md border-2 border-bdr bg-gray-50 p-12 text-center">
        <p className="text-ink-2">You are not associated with any company</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 border-b border-bdr pb-8">
        <h1 className="text-3xl font-normal tracking-tight text-ink">Company Information</h1>
        <p className="mt-1 text-sm text-ink-2">View and manage your company details</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Company Info */}
        <div className="rounded-md border-2 border-bdr p-6">
          <h2 className="font-normal text-ink mb-4">Company Details</h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-normal uppercase tracking-wider text-ink-3">Company Name</p>
              <p className="text-lg font-normal text-ink mt-1">{company.name}</p>
            </div>
            {company.gstin && (
              <div>
                <p className="text-xs font-normal uppercase tracking-wider text-ink-3">GSTIN</p>
                <p className="text-sm text-ink mt-1">{company.gstin}</p>
              </div>
            )}
            {company.phone && (
              <div>
                <p className="text-xs font-normal uppercase tracking-wider text-ink-3">Phone</p>
                <p className="text-sm text-ink mt-1">{company.phone}</p>
              </div>
            )}
            {company.website && (
              <div>
                <p className="text-xs font-normal uppercase tracking-wider text-ink-3">Website</p>
                <p className="text-sm text-ink mt-1">{company.website}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-normal uppercase tracking-wider text-ink-3">Member Since</p>
              <p className="text-sm text-ink mt-1">
                {new Date(company.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="rounded-md border-2 border-bdr p-6">
          <h2 className="font-normal text-ink mb-4">Team Members ({company.users.length})</h2>
          <div className="space-y-3">
            {company.users.map((user) => (
              <div key={user.id} className="flex items-start justify-between border-b border-bdr pb-3 last:border-0">
                <div>
                  <p className="font-normal text-ink text-sm">{user.name}</p>
                  <p className="text-xs text-ink-2">{user.email}</p>
                </div>
                <span className="text-xs font-normal bg-em-50 text-em-700 px-2 py-1 rounded">
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
