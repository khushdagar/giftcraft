import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== 'vendor') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Vendor access required' } },
        { status: 403 }
      );
    }

    const vendor = await prisma.vendor.findFirst({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        vendorScore: true,
        pos: {
          where: { status: { in: ['pending', 'in_progress'] } },
          select: { id: true, orderId: true, status: true, deadline: true, totalAmount: true },
          orderBy: { deadline: 'asc' },
          take: 5,
        },
        payments: {
          where: { status: 'pending' },
          select: { id: true, invoiceNumber: true, amount: true, dueDate: true },
          orderBy: { dueDate: 'asc' },
          take: 5,
        },
      },
    });

    if (!vendor) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: vendor });
  } catch (error) {
    console.error('Error fetching vendor dashboard:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch dashboard' } },
      { status: 500 }
    );
  }
}
