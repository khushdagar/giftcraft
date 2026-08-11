import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ProposalBuilder } from '@/components/admin/proposals/proposal-builder';

export const revalidate = 0;

/**
 * Full-page proposal composer. Opened from an enquiry row (prefilled via query
 * params) or from the proposals list.
 */
export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: { email?: string; name?: string; company?: string; leadId?: string };
}) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  return (
    <ProposalBuilder
      prefill={{
        email: searchParams.email ?? '',
        name: searchParams.name ?? '',
        company: searchParams.company ?? '',
      }}
      leadId={searchParams.leadId ?? null}
    />
  );
}
