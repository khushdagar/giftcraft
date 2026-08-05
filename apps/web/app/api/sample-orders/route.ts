import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { zPincode } from '@/lib/zod-fields';
import { sendPushToAdmins } from '@/lib/push';

const createSampleSchema = z.object({
  productId: z.string().min(1),
  addressLine1: z.string().trim().min(5).max(300),
  addressLine2: z.string().trim().max(300).optional(),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  pincode: zPincode,
  notes: z.string().optional(),
});

type SampleData = z.infer<typeof createSampleSchema>;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = createSampleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Create sample order
    const addressJson = {
      line1: data.addressLine1,
      line2: data.addressLine2 || '',
      city: data.city,
      state: data.state,
      pincode: data.pincode,
    };

    const sample = await prisma.sampleOrder.create({
      data: {
        productId: data.productId,
        userId: session.user.id,
        notes: data.notes,
        addressJson: addressJson,
        status: 'requested',
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: { take: 1 },
          },
        },
      },
    });

    console.log('✅ Sample order created:', sample.id);

    sendPushToAdmins({
      title: `Sample request: ${sample.product.name}`,
      body: `${session.user.name || 'A customer'} requested a sample — awaiting approval.`,
      url: '/admin/samples',
      tag: `sample-${sample.id}`,
    }).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        data: {
          id: sample.id,
          status: sample.status,
          product: sample.product,
          createdAt: sample.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Error creating sample order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create sample order' },
      { status: 500 }
    );
  }
}
