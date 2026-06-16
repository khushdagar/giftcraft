import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user?.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const vendors = await prisma.vendor.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        vendorScore: { select: { qualityScore: true } },
        _count: { select: { pos: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: vendors });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch vendors' } },
      { status: 500 }
    );
  }
}
