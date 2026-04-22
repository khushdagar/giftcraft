import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = new URL(request.url).searchParams;
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const limit = Math.min(50, Number(searchParams.get('limit') || '10'));

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: {
          placedById: session.user.id,
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          grandTotal: true,
          createdAt: true,
          _count: {
            select: { items: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({
        where: {
          placedById: session.user.id,
        },
      }),
    ]);

    return NextResponse.json({
      orders: orders.map((order) => ({
        ...order,
        itemCount: order._count.items,
        _count: undefined,
      })),
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching dashboard orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
