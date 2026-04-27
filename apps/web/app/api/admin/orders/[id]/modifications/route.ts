import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createModificationSchema = z.object({
  diffJson: z.record(z.any()),
  reason: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const modifications = await prisma.orderModification.findMany({
      where: { orderId: params.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: modifications });
  } catch (error) {
    console.error('GET /api/admin/orders/[id]/modifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = params.id;
    const body = await request.json();
    const parsed = createModificationSchema.parse(body);

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const modification = await prisma.orderModification.create({
      data: {
        orderId,
        modifiedBy: session.user.id,
        diffJson: parsed.diffJson,
        reason: parsed.reason,
      },
    });

    return NextResponse.json(
      { success: true, data: modification },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('POST /api/admin/orders/[id]/modifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
