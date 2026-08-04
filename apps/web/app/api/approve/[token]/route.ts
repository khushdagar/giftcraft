import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendRevisionReceivedEmail, sendBalancePaymentLinkEmail } from '@/lib/email';
import { sendPushToAdmins } from '@/lib/push';

const round2 = (n: number) => Math.round(n * 100) / 100;

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
            billingJson: true,
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
            grandTotal: true,
            billingJson: true,
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
      // Work out the pending balance (grand total minus any advance paid).
      const billing = (approval.order.billingJson as any) || {};
      const grandTotal = Number(approval.order.grandTotal);
      const amountPaid = Number(billing.amountPaid ?? 0);
      const balanceDue = round2(Math.max(0, grandTotal - amountPaid));

      // Status stays 'mockup_approved'; the "payment pending" state is derived
      // from (mockup_approved + balance due) so we don't depend on a brand-new
      // enum value. If there's no balance, go straight to production.
      const nextStatus = balanceDue > 0 ? 'mockup_approved' : 'production';

      // Approve the artwork AND advance the order status atomically — so we can
      // never end up with an "approved but status unchanged" half-state.
      const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.artworkApproval.update({
          where: { id: approval.id },
          data: { status: 'approved', approvedAt: new Date() },
        });
        await tx.order.update({
          where: { id: approval.orderId },
          data: { status: nextStatus },
        });
        await tx.orderTimeline.create({
          data: {
            orderId: approval.orderId,
            status: nextStatus,
            note:
              balanceDue > 0
                ? `Mockup approved by customer — balance of ₹${balanceDue.toFixed(2)} pending`
                : 'Mockup approved by customer',
          },
        });
        return u;
      });

      // Email the customer a payment link for the pending balance.
      const customerEmail = approval.order.placedBy?.email || billing.email;
      if (balanceDue > 0 && customerEmail) {
        try {
          await sendBalancePaymentLinkEmail({
            customerEmail,
            customerName: approval.order.placedBy?.name || billing.name || 'there',
            orderNumber: approval.order.orderNumber,
            orderId: approval.order.id,
            balanceDue,
          });
        } catch (e) {
          console.error('Balance payment email failed (non-blocking):', e);
        }
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Artwork approved successfully',
          approval: updated,
          balanceDue,
          nextStatus,
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
      const adminEmail = process.env.SENDGRID_FROM_EMAIL || 'orders@givoo.in';
      await sendRevisionReceivedEmail(
        adminEmail,
        approval.order.orderNumber,
        approval.order.placedBy?.name || 'Customer',
        notes
      );

      // Real-time desktop push to admins (best-effort). The bell already derives
      // this from the revision_requested status; the push makes it active. Tag +
      // url match the bell's revision-<id> key / admin order link, so opening the
      // order clears it.
      sendPushToAdmins({
        title: `Changes requested on ${approval.order.orderNumber}`,
        body: notes.length > 120 ? `${notes.slice(0, 117)}…` : notes,
        url: `/admin/orders/${approval.order.id}`,
        tag: `revision-${approval.id}`,
      }).catch(() => {});

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
