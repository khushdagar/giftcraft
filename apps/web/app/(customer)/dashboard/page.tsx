import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { formatRupees } from '@/lib/utils';
import { DashboardContent } from '@/components/dashboard/dashboard-content';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/dashboard');
  }

  // Fetch user stats
  const [totalOrders, totalSpent, orders] = await Promise.all([
    prisma.order.count({
      where: { userId: session.user.id },
    }),
    prisma.order.aggregate({
      where: { userId: session.user.id },
      _sum: { grandTotal: true },
    }),
    prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        grandTotal: true,
        createdAt: true,
        items: { select: { id: true } },
      },
    }),
  ]);

  const totalSpentAmount = totalSpent._sum.grandTotal || 0;

  return (
    <div className="min-h-screen bg-canvas py-8 px-4">
      <div className="container-gc-w max-w-6xl">
        {/* Welcome Card */}
        <div className="rounded-gc-l bg-[#F5F3FF] border-2 border-[#EDE9FE] p-6 mb-8">
          <div className="flex items-center gap-4">
            {session.user.image && (
              <img
                src={session.user.image}
                alt={session.user.name || 'User'}
                className="h-12 w-12 rounded-full"
              />
            )}
            <div>
              <h1 className="text-2xl font-black text-ink">
                Welcome back, {session.user.name}
              </h1>
              <p className="text-sm text-ink-3">{session.user.email}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Orders */}
          <div className="rounded-gc-l bg-[#EEF2FF] border-2 border-[#E0E7FF] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6366F1] mb-2">
              Total Orders
            </p>
            <p className="text-3xl font-black text-[#4F46E5]">{totalOrders}</p>
          </div>

          {/* Total Spent */}
          <div className="rounded-gc-l bg-gold-50 border-2 border-gold p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-700 mb-2">
              Total Spent
            </p>
            <p className="text-2xl font-black text-gold-900 tabnum">
              {formatRupees(Number(totalSpentAmount))}
            </p>
          </div>

          {/* Active Quotes */}
          <div className="rounded-gc-l bg-em-50 border-2 border-em p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-em-700 mb-2">
              Active Quotes
            </p>
            <p className="text-3xl font-black text-em">0</p>
          </div>

          {/* Saved Designs */}
          <div className="rounded-gc-l bg-[#FFF7ED] border-2 border-[#FFEDD5] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#EA580C] mb-2">
              Saved Designs
            </p>
            <p className="text-3xl font-black text-[#EA580C]">0</p>
          </div>
        </div>

        {/* Dashboard Content (Tabs) */}
        <DashboardContent userId={session.user.id} initialOrders={orders} />
      </div>
    </div>
  );
}
