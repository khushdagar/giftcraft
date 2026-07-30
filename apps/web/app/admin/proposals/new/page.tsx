import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ProposalForm } from '@/components/admin/proposals/proposal-form';

export const revalidate = 0;

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: { email?: string; name?: string; company?: string };
}) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-bdr pb-6">
        <h1 className="text-4xl font-normal tracking-tight text-ink">New Proposal</h1>
        <p className="mt-2 text-sm text-ink-2">
          Pick products, set the pack quantity, and email the lead a shareable quote with the proposal deck PDF attached
        </p>
      </div>

      <ProposalForm
        prefill={{
          email: searchParams.email || '',
          name: searchParams.name || '',
          company: searchParams.company || '',
        }}
      />
    </div>
  );
}
