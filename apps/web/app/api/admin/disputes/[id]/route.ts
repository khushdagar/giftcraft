import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendDisputeStatusEmail } from '@/lib/email';
import { z } from 'zod';

const UpdateDisputeSchema = z.object({
  status: z.enum(['open', 'under_review', 'resolved', 'closed']),
  resolutionNote: z.string().optional(),
});

export async function GET(
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

    const dispute = await prisma.disputeTicket.findUnique({
      where: { id },
      select: {
        id: true,
        subject: true,
        body: true,
        photoUrls: true,
        status: true,
        resolutionNote: true,
        resolvedAt: true,
        windowExpiresAt: true,
        createdAt: true,
        updatedAt: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            company: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!dispute) {
      return NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: dispute,
    });
  } catch (error) {
    console.error('Error fetching dispute:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dispute' },
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
    if (!session || session.user?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const validation = UpdateDisputeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { status, resolutionNote } = validation.data;

    // If marking as resolved, resolution note is required
    if (status === 'resolved' && !resolutionNote) {
      return NextResponse.json(
        { error: 'Resolution note is required when marking as resolved' },
        { status: 400 }
      );
    }

    // Fetch dispute
    const dispute = await prisma.disputeTicket.findUnique({
      where: { id },
      select: {
        order: {
          select: {
            orderNumber: true,
            company: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        },
        submittedBy: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!dispute) {
      return NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      );
    }

    // Update dispute
    const updatedDispute = await prisma.disputeTicket.update({
      where: { id },
      data: {
        status,
        resolutionNote: status === 'resolved' ? resolutionNote : undefined,
        resolvedAt: status === 'resolved' ? new Date() : undefined,
      },
      select: {
        id: true,
        status: true,
        resolutionNote: true,
        resolvedAt: true,
      },
    });

    // Send email notification to customer
    try {
      await sendDisputeStatusEmail({
        customerEmail: dispute.submittedBy?.email || '',
        customerName: dispute.order.company?.name || 'Customer',
        orderNumber: dispute.order.orderNumber,
        disputeId: id,
        status,
        resolutionNote,
      });
    } catch (emailError) {
      console.error('Error sending dispute status email:', emailError);
    }

    return NextResponse.json({
      success: true,
      data: updatedDispute,
    });
  } catch (error) {
    console.error('Error updating dispute:', error);
    return NextResponse.json(
      { error: 'Failed to update dispute' },
      { status: 500 }
    );
  }
}
