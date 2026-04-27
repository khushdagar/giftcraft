import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const UpdateHsnCodeSchema = z.object({
  code: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  defaultGstRate: z.number().min(0).max(100).optional(),
});

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const hsnCode = await prisma.hsnCode.findUnique({
      where: { id: params.id },
    });

    if (!hsnCode) {
      return NextResponse.json({ error: 'HSN code not found' }, { status: 404 });
    }

    return NextResponse.json(hsnCode);
  } catch (error) {
    console.error('Error fetching HSN code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const data = UpdateHsnCodeSchema.parse(body);

    const existing = await prisma.hsnCode.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'HSN code not found' }, { status: 404 });
    }

    const updated = await prisma.hsnCode.update({
      where: { id: params.id },
      data: {
        ...(data.code && { code: data.code }),
        ...(data.description && { description: data.description }),
        ...(data.defaultGstRate !== undefined && { defaultGstRate: data.defaultGstRate }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating HSN code:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const existing = await prisma.hsnCode.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'HSN code not found' }, { status: 404 });
    }

    await prisma.hsnCode.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting HSN code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
