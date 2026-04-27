import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

const UpdateScoreSchema = z.object({
  score: z.number().min(0).max(100),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const validation = UpdateScoreSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        score: new Decimal(validation.data.score),
      },
      select: {
        id: true,
        name: true,
        score: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    console.error('Error updating vendor score:', error);
    return NextResponse.json(
      { error: 'Failed to update vendor score' },
      { status: 500 }
    );
  }
}
