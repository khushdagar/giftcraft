import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { zEmail, zPhone } from '@/lib/zod-fields';
import { sendPushToAdmins } from '@/lib/push';

const RestockRequestSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1).max(300),
  email: zEmail,
  phone: zPhone.optional().or(z.literal('')),
});

/**
 * POST /api/restock-requests
 * "Notify me" submission from a pack page when one of the pack's member
 * products is out of stock (draft/archived). Public — no auth required.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = RestockRequestSchema.parse(body);

    const restockRequest = await prisma.restockRequest.create({
      data: {
        productId: data.productId,
        productName: data.productName,
        email: data.email,
        phone: data.phone || null,
      },
      select: { id: true },
    });

    sendPushToAdmins({
      title: `Restock request: ${data.productName}`,
      body: `${data.email} wants to know when this is back in stock`,
      url: '/admin/restock-requests',
      tag: `restock-${restockRequest.id}`,
    }).catch(() => {});

    return NextResponse.json({ success: true, data: { id: restockRequest.id } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0]?.message || 'Invalid data' },
        { status: 400 }
      );
    }
    console.error('Error creating restock request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit request' },
      { status: 500 }
    );
  }
}
