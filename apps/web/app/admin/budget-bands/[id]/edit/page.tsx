import { auth } from '@/auth';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { BudgetBandForm } from '@/components/admin/budget-bands/budget-band-form';

export const dynamic = 'force-dynamic';

export default async function EditBudgetBandPage({ params }: { params: { id: string } }) {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const band = await prisma.budgetBand.findUnique({ where: { id: params.id } });
  if (!band) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <BudgetBandForm mode="edit" band={band} />
    </div>
  );
}
