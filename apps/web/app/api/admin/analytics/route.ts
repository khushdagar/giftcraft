import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { Decimal } from '@prisma/client/runtime/library';

export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all confirmed/completed orders
    const orders = await prisma.order.findMany({
      where: {
        status: {
          in: ['confirmed', 'completed', 'shipped', 'delivered'],
        },
      },
      include: {
        company: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate stats
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum.plus(order.grandTotal), new Decimal(0));
    const avgOrderValue = totalOrders > 0 ? totalRevenue.dividedBy(totalOrders) : new Decimal(0);

    // Get previous month's orders for comparison
    const today = new Date();
    const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(oneMonthAgo.getTime() - 30 * 24 * 60 * 60 * 1000);

    const ordersThisMonth = orders.filter((order) => order.createdAt >= oneMonthAgo).length;
    const ordersLastMonth = orders.filter(
      (order) => order.createdAt >= twoMonthsAgo && order.createdAt < oneMonthAgo
    ).length;

    const orderChange = ordersLastMonth > 0 ? ((ordersThisMonth - ordersLastMonth) / ordersLastMonth * 100).toFixed(0) : '+100';
    const revenueThisMonth = orders
      .filter((order) => order.createdAt >= oneMonthAgo)
      .reduce((sum, order) => sum.plus(order.grandTotal), new Decimal(0));
    const revenueLastMonth = orders
      .filter((order) => order.createdAt >= twoMonthsAgo && order.createdAt < oneMonthAgo)
      .reduce((sum, order) => sum.plus(order.grandTotal), new Decimal(0));

    const revenueChange =
      revenueLastMonth.toNumber() > 0
        ? (((revenueThisMonth.toNumber() - revenueLastMonth.toNumber()) / revenueLastMonth.toNumber()) * 100).toFixed(0)
        : '+100';

    // Revenue by month (last 12 months)
    const monthlyRevenue: Record<string, Decimal> = {};
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 30 * 24 * 60 * 60 * 1000);
      const month = date.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      monthlyRevenue[month] = new Decimal(0);
    }

    orders.forEach((order) => {
      const month = order.createdAt.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      if (monthlyRevenue[month] !== undefined) {
        monthlyRevenue[month] = monthlyRevenue[month].plus(order.grandTotal);
      }
    });

    const revenueData = Object.entries(monthlyRevenue).map(([month, revenue]) => ({
      month,
      revenue: revenue.toNumber(),
    }));

    // Order status distribution
    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      _count: true,
    });

    const statusData = statusCounts
      .map((status) => ({
        name: status.status,
        value: status._count,
      }))
      .sort((a, b) => b.value - a.value);

    // Recent orders
    const recentOrders = orders.slice(0, 10).map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      companyName: order.company?.name || 'Unknown Company',
      totalAmount: order.grandTotal.toNumber(),
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    }));

    const stats = [
      {
        label: 'Total Orders',
        value: totalOrders.toLocaleString('en-IN'),
        change: `+${orderChange}% from last month`,
        trend: parseInt(orderChange) >= 0 ? ('up' as const) : ('down' as const),
      },
      {
        label: 'Revenue',
        value: `₹${totalRevenue.toNumber().toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
        change: `+${revenueChange}% from last month`,
        trend: parseInt(revenueChange) >= 0 ? ('up' as const) : ('down' as const),
      },
      {
        label: 'Avg Order Value',
        value: `₹${avgOrderValue.toNumber().toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
        change: `${avgOrderValue.toNumber().toFixed(0)} per order`,
        trend: 'up' as const,
      },
      {
        label: 'Confirmed Orders',
        value: orders.filter((o) => o.status === 'confirmed').length.toString(),
        change: 'Pending fulfillment',
        trend: 'up' as const,
      },
    ];

    return NextResponse.json({
      stats,
      revenueData,
      statusData,
      recentOrders,
    });
  } catch (error) {
    console.error('GET /api/admin/analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
