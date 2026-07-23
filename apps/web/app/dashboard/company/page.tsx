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

      {/* Company Info — editable (create or update). Team-member/role
          management is an admin concern and lives in the admin dashboard, so
          it is intentionally not shown in the customer portal. */}
      <div className="max-w-2xl">
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
      </div>
    </div>
  );
}
