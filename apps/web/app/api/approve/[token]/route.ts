import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendRevisionReceivedEmail } from '@/lib/email';

/**
 * GET /api/approve/[token]
 * Fetch artwork approval details (public, no auth)
 * Used by the approval page to display mockup and order info
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    // Find approval by token
    const approval = await prisma.artworkApproval.findUnique({
      where: { token },
      select: {
        id: true,
        orderId: true,
        revision: true,
        fileUrl: true,
        status: true,
        revisionNotes: true,
        approvedAt: true,
        expiresAt: true,
        createdAt: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            grandTotal: true,
            deliveryDate: true,
            items: {
              select: {
                product: { select: { name: true, slug: true } },
                quantity: true,
                unitPrice: true,
              },
            },
            company: { select: { name: true } },
            placedBy: { select: { name: true } },
          },
        },
      },
    });

    if (!approval) {
      return NextResponse.json(
        { error: 'Approval not found' },
        { status: 404 }
      );
    }

    // Check if approval has expired
    if (new Date() > approval.expiresAt) {
      return NextResponse.json(
        { error: 'Approval link has expired' },
        { status: 410 } // Gone
      );
    }

    // Check if already approved
    if (approval.status === 'approved') {
      return NextResponse.json(
        { error: 'This order has already been approved' },
        { status: 400 }
      );
    }

    return NextResponse.json(approval, { status: 200 });
  } catch (error) {
    console.error('Error fetching approval:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approval' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/approve/[token]
 * Submit approval or revision request (public, no auth)
 * Body: { action: 'approve' | 'revision', notes?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const body = await request.json();
    const { action, notes } = body;

    if (!action || !['approve', 'revision'].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'approve' or 'revision'" },
        { status: 400 }
      );
    }

    // Find approval by token
    const approval = await prisma.artworkApproval.findUnique({
      where: { token },
      select: {
        id: true,
        orderId: true,
        status: true,
        expiresAt: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            revisionCount: true,
            placedBy: { select: { email: true, name: true } },
          },
        },
      },
    });

    if (!approval) {
      return NextResponse.json(
        { error: 'Approval not found' },
        { status: 404 }
      );
    }

    // Check if approval has expired
    if (new Date() > approval.expiresAt) {
      return NextResponse.json(
        { error: 'Approval link has expired' },
        { status: 410 } // Gone
      );
    }

    // Check if already processed
    if (approval.status !== 'pending') {
      return NextResponse.json(
        { error: `This approval has already been ${approval.status}` },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      // Approve the artwork
      const updated = await prisma.artworkApproval.update({
        where: { id: approval.id },
        data: {
          status: 'approved',
          approvedAt: new Date(),
        },
      });

      // Update order status to mockup_approved
      await prisma.order.update({
        where: { id: approval.orderId },
        data: { status: 'mockup_approved' },
      });

      // Create timeline entry
      await prisma.orderTimeline.create({
        data: {
          orderId: approval.orderId,
          status: 'mockup_approved',
          note: 'Artwork approved by customer',
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Artwork approved successfully',
          approval: updated,
        },
        { status: 200 }
      );
    } else {
      // Request revision
      if (!notes || notes.trim() === '') {
        return NextResponse.json(
          { error: 'Revision notes are required' },
          { status: 400 }
        );
      }

      const updated = await prisma.artworkApproval.update({
        where: { id: approval.id },
        data: {
          status: 'revision_requested',
          revisionNotes: notes,
        },
      });

      // Increment order revision count
      await prisma.order.update({
        where: { id: approval.orderId },
        data: { revisionCount: { increment: 1 } },
      });

      // Create timeline entry
      await prisma.orderTimeline.create({
        data: {
          orderId: approval.orderId,
          status: 'mockup_pending', // Stay in mockup_pending state
          note: `Revision requested: ${notes}`,
        },
      });

      // Send email to admin about revision request
      const adminEmail = process.env.SENDGRID_FROM_EMAIL || 'orders@giftcraft.in';
      await sendRevisionReceivedEmail(
        adminEmail,
        approval.order.orderNumber,
        approval.order.placedBy?.name || 'Customer',
        notes
      );

      return NextResponse.json(
        {
          success: true,
          message: 'Revision request submitted',
          approval: updated,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Error processing approval:', error);
    return NextResponse.json(
      { error: 'Failed to process approval' },
      { status: 500 }
    );
  }
}
