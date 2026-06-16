import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createSampleSchema = z.object({
  productId: z.string().min(1),
  addressLine1: z.string().min(3),
  addressLine2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/),
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
            image: true,
            basePrice: true,
          },
        },
      },
    });

    console.log('✅ Sample order created:', sample.id);

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
