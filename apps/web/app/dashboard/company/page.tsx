import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CompanyDetailsForm } from './company-details-form';

export const dynamic = 'force-dynamic';

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

  // Per SOW §3.7.3, every customer has a Company Profile they can view/edit. If
  // the account isn't linked to one yet (self-serve signups don't create it),
  // we show the same form empty so the user can set it up — saving creates the
  // company and links their account.
  const isNew = !company;

  return (
    <div>
      <div className="mb-8 border-b border-bdr pb-8">
        <h1 className="text-3xl font-normal tracking-tight text-ink">
          {isNew ? 'Set Up Your Company' : 'Company Information'}
        </h1>
        <p className="mt-1 text-sm text-ink-2">
          {isNew
            ? 'Add your company details to speed up every future checkout.'
            : 'These details are saved and reused automatically at checkout.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Company Info — editable (create or update) */}
        <CompanyDetailsForm
          canEdit
          isNew={isNew}
          initial={{
            name: company?.name ?? '',
            gstin: company?.gstin ?? '',
            pan: company?.pan ?? '',
            addressLine: company?.addressLine ?? '',
            city: company?.city ?? '',
            state: company?.state ?? '',
            pincode: company?.pincode ?? '',
            phone: company?.phone ?? '',
            website: company?.website ?? '',
          }}
        />

        {/* Team Members — only once a company exists */}
        {company ? (
          <div className="rounded-md border-2 border-bdr bg-white p-6">
            <h2 className="font-normal text-ink mb-4">
              Team Members ({company.users.length})
            </h2>
            <div className="space-y-3">
              {company.users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-start justify-between border-b border-bdr pb-3 last:border-0"
                >
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
        ) : (
          <div className="rounded-md border-2 border-dashed border-bdr p-6 flex items-center justify-center">
            <p className="text-sm text-ink-3 text-center">
              Your team members will appear here once your company is set up.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
