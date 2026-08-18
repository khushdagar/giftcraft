import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getPacks } from '@/lib/pack-data';
import { bandContains } from '@/lib/budget-bands';
import { BudgetBandList } from '@/components/admin/budget-bands/budget-band-list';

export const dynamic = 'force-dynamic';

const money = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default async function AdminBudgetBandsPage() {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const [rows, packs] = await Promise.all([
    prisma.budgetBand.findMany({ orderBy: [{ sortOrder: 'asc' }, { minPrice: 'asc' }] }),
    getPacks(),
  ]);

  const bands = rows.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    imageUrl: b.imageUrl,
    gradient: b.gradient,
    minPrice: b.minPrice,
    maxPrice: b.maxPrice,
    isActive: b.isActive,
    packCount: packs.filter((p) =>
      bandContains({ min: b.minPrice, max: b.maxPrice }, p.fromPrice)
    ).length,
  }));

  // Uncovered stretches of the ladder. Walking the sorted ranges is enough
  // because the API already refuses to let two bands overlap.
  const gaps: string[] = [];
  const sorted = [...bands].sort((a, b) => a.minPrice - b.minPrice);
  let cursor = 0;
  for (const band of sorted) {
    if (band.minPrice > cursor) gaps.push(`${money(cursor)}–${money(band.minPrice)}`);
    if (band.maxPrice == null) {
      cursor = Number.POSITIVE_INFINITY;
      break;
    }
    cursor = Math.max(cursor, band.maxPrice);
  }
  if (Number.isFinite(cursor)) gaps.push(`${money(cursor)} and above`);

  return <BudgetBandList bands={bands} gaps={gaps} />;
}
