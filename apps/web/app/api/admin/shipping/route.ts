import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const CreateShippingZoneSchema = z.object({
  name: z.string().min(1),
  states: z.array(z.string()),
  flatRate: z.number().positive(),
  etaMinDays: z.number().int().positive(),
  etaMaxDays: z.number().int().positive(),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const zones = await prisma.shippingZone.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(zones);
  } catch (error) {
    console.error('Error fetching shipping zones:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const data = CreateShippingZoneSchema.parse(body);

    const zone = await prisma.shippingZone.create({
      data: {
        name: data.name,
        states: data.states,
        flatRate: data.flatRate,
        etaMinDays: data.etaMinDays,
        etaMaxDays: data.etaMaxDays,
        isActive: data.isActive ?? true,
      },
    });

    return NextResponse.json(zone);
  } catch (error) {
    console.error('Error creating shipping zone:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
