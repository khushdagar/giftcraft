import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const updateSampleSchema = z.object({
  status: z.enum(['requested', 'approved', 'shipped', 'rejected']),
  adminNotes: z.string().optional(),
});

interface RouteParams {
  params: { id: string };
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await req.json();
    const validation = updateSampleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check sample exists
    const existing = await prisma.sampleOrder.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Sample order not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {
      status: data.status,
      ...(data.adminNotes !== undefined && { adminNotes: data.adminNotes }),
    };

    // Set timestamps based on status
    if (data.status === 'approved') {
      updateData.approvedAt = new Date();
    } else if (data.status === 'shipped') {
      updateData.shippedAt = new Date();
    }

    const sample = await prisma.sampleOrder.update({
      where: { id },
      data: updateData,
      include: {
        product: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    console.log('✅ Sample order updated:', sample.id, 'status:', sample.status);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: sample.id,
          status: sample.status,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Error updating sample order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update sample order' },
      { status: 500 }
    );
  }
}
