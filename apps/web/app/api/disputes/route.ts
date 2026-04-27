import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendDisputeConfirmationEmail } from '@/lib/email';
import { z } from 'zod';

const CreateDisputeSchema = z.object({
  orderId: z.string().cuid(),
  subject: z.string().min(5).max(200),
  body: z.string().min(10).max(2000),
  photoUrls: z.array(z.string().url()).min(1).max(3),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = CreateDisputeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { orderId, subject, body: disputeBody, photoUrls } = validation.data;

    // Fetch order and verify ownership
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify user's company owns this order
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!user || user.companyId !== order.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check 48h delivery window
    const deliveredEntry = await prisma.orderTimeline.findFirst({
      where: {
        orderId,
        status: { in: ['delivered', 'completed'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!deliveredEntry) {
      return NextResponse.json(
        { error: 'Order must be delivered to file a dispute' },
        { status: 400 }
      );
    }

    const windowExpiresAt = new Date(
      deliveredEntry.createdAt.getTime() + 48 * 60 * 60 * 1000
    );

    if (new Date() > windowExpiresAt) {
      return NextResponse.json(
        { error: 'Dispute window has expired (48 hours from delivery)' },
        { status: 400 }
      );
    }

    // Create dispute ticket
    const dispute = await prisma.disputeTicket.create({
      data: {
        orderId,
        submittedById: session.user.id,
        subject,
        body: disputeBody,
        photoUrls,
        status: 'open',
        windowExpiresAt,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    // Send confirmation email
    try {
      await sendDisputeConfirmationEmail({
        customerEmail: '',
        customerName: order.company?.name || 'Customer',
        orderNumber: order.orderNumber,
        disputeId: dispute.id,
        subject,
      });
    } catch (emailError) {
      console.error('Error sending dispute confirmation email:', emailError);
    }

    return NextResponse.json({
      success: true,
      data: {
        disputeId: dispute.id,
        orderId,
        createdAt: dispute.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating dispute:', error);
    return NextResponse.json(
      { error: 'Failed to create dispute' },
      { status: 500 }
    );
  }
}
