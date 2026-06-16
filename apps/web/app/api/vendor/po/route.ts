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
      select: { id: true },
    });

    if (!vendor) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } },
        { status: 404 }
      );
    }

    const pos = await prisma.vendorPO.findMany({
      where: { vendorId: vendor.id },
      include: {
        order: {
          select: { id: true, orderNumber: true, packQuantity: true, company: { select: { name: true } } },
        },
      },
      orderBy: { deadline: 'asc' },
    });

    return NextResponse.json({ success: true, data: pos });
  } catch (error) {
    console.error('Error fetching vendor POs:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch POs' } },
      { status: 500 }
    );
  }
}
