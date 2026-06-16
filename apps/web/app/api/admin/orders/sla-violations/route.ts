import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { getSlaMinutesForStage } from '@/lib/sla';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status');

    // Fetch all breached SLA logs (active or recent)
    const violations = await prisma.orderSlaLog.findMany({
      where: {
        isBreached: true,
        // Can include both active (exitedAt null) and recently breached (exitedAt recent)
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            placedBy: {
              select: { email: true, name: true },
            },
            company: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { enteredAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Calculate breach details
    const enriched = violations.map((log) => {
      const now = new Date();
      const elapsedMinutes = log.exitedAt
        ? (log.exitedAt.getTime() - log.enteredAt.getTime()) / (1000 * 60)
        : (now.getTime() - log.enteredAt.getTime()) / (1000 * 60);

      const breachedByMinutes = Math.round(elapsedMinutes - log.slaMinutes);
      const isActive = log.exitedAt === null;

      return {
        id: log.id,
        orderId: log.order.id,
        orderNumber: log.order.orderNumber,
        status: log.order.status,
        stage: log.stage,
        companyName: log.order.company?.name || 'Unknown',
        enteredAt: log.enteredAt,
        exitedAt: log.exitedAt,
        slaMinutes: log.slaMinutes,
        elapsedMinutes: Math.round(elapsedMinutes),
        breachedByMinutes,
        isActive,
        breachedByFormatted: formatMinutes(breachedByMinutes),
      };
    });

    // Get total count
    const total = await prisma.orderSlaLog.count({
      where: { isBreached: true },
    });

    return NextResponse.json(
      {
        success: true,
        data: enriched,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Error fetching SLA violations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch SLA violations' },
      { status: 500 }
    );
  }
}

function formatMinutes(minutes: number): string {
  if (minutes < 0) return 'N/A';
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = Math.floor(minutes % 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${mins}m`;
  } else {
    return `${mins}m`;
  }
}
