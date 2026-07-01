import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const patchSchema = z.object({
  tier: z.enum(['standard', 'silver', 'gold', 'platinum']).optional(),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const client = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Orders aren't linked to a company directly, so attribute them via the
    // placer's companyId (or a directly-set order.companyId, if present).
    const PLACED_STATUSES = [
      'confirmed',
      'mockup_pending',
      'mockup_approved',
      'production',
      'quality_check',
      'packed',
      'shipped',
      'in_transit',
      'delivered',
      'completed',
      'cancelled',
      'refunded',
    ];
    const orderRows = await prisma.order.findMany({
      where: {
        status: { in: PLACED_STATUSES as any },
        OR: [{ companyId: params.id }, { placedBy: { companyId: params.id } }],
      },
      select: {
        id: true,
        orderNumber: true,
        grandTotal: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map to the shape the client detail page expects (totalAmount: number).
    const orders = orderRows.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      totalAmount: Number(o.grandTotal),
      status: o.status,
      createdAt: o.createdAt,
    }));

    return NextResponse.json({ ...client, orders });
  } catch (error) {
    console.error('GET /api/admin/clients/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = patchSchema.parse(body);

    const updateData: any = {};
    if (parsed.tier) updateData.tier = parsed.tier;
    if (parsed.notes !== undefined) updateData.notes = parsed.notes;

    const updated = await prisma.company.update({
      where: { id: params.id },
      data: updateData,
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
        orders: {
          where: {
            status: {
              in: ['confirmed', 'completed', 'shipped', 'cancelled'],
            },
          },
          select: {
            id: true,
            orderNumber: true,
            grandTotal: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('PATCH /api/admin/clients/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
