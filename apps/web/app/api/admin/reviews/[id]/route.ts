import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

const VALID_STATUSES = ['pending', 'approved', 'rejected'] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const status = body.status as (typeof VALID_STATUSES)[number];
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const review = await prisma.review.update({
      where: { id: params.id },
      data: { status },
    });

    return NextResponse.json({ success: true, data: review });
  } catch (error: any) {
    console.error('Error updating review:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update review' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.review.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting review:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete review' },
      { status: 500 }
    );
  }
}
