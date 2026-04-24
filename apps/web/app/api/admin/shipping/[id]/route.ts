import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const UpdateShippingZoneSchema = z.object({
  name: z.string().min(1).optional(),
  states: z.array(z.string()).optional(),
  flatRate: z.number().positive().optional(),
  etaMinDays: z.number().int().positive().optional(),
  etaMaxDays: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const data = UpdateShippingZoneSchema.parse(body);

    const existing = await prisma.shippingZone.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    }

    const updated = await prisma.shippingZone.update({
      where: { id: params.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.states && { states: data.states }),
        ...(data.flatRate && { flatRate: data.flatRate }),
        ...(data.etaMinDays && { etaMinDays: data.etaMinDays }),
        ...(data.etaMaxDays && { etaMaxDays: data.etaMaxDays }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating shipping zone:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const existing = await prisma.shippingZone.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    }

    await prisma.shippingZone.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting shipping zone:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
