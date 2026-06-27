import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { uploadToDigitalOcean } from '@/lib/upload-to-digital-ocean';
import { sendArtworkApprovalEmail } from '@/lib/email';
import { nanoid } from 'nanoid';

export async function POST(
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
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    // Allow a pasted image URL as an alternative to uploading a file — handy
    // for local testing when Digital Ocean Spaces credentials aren't set.
    const pastedUrl = (formData.get('fileUrl') as string | null)?.trim();

    if ((!imageFile || imageFile.size === 0) && !pastedUrl) {
      return NextResponse.json(
        { error: 'Provide a mockup image file or an image URL' },
        { status: 400 }
      );
    }

    // Fetch order with company info
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        companyId: true,
        placedById: true,
        company: { select: { name: true } },
        placedBy: { select: { email: true, name: true } },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Resolve the mockup URL: an uploaded file takes priority over a pasted URL.
    const fileUrl =
      imageFile && imageFile.size > 0
        ? await uploadToDigitalOcean(imageFile, 'mockups')
        : (pastedUrl as string);

    // Version increments per order: v1, v2, v3… (SOW §3.7.2).
    const last = await prisma.artworkApproval.findFirst({
      where: { orderId: id },
      orderBy: { revision: 'desc' },
      select: { revision: true },
    });
    const revision = (last?.revision ?? 0) + 1;

    // Generate unique approval token
    const token = nanoid(16);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours from now

    // Create ArtworkApproval record
    const approval = await prisma.artworkApproval.create({
      data: {
        orderId: id,
        revision,
        fileUrl: fileUrl || null,
        token,
        expiresAt,
        status: 'pending',
      },
      select: {
        id: true,
        revision: true,
        token: true,
        fileUrl: true,
        expiresAt: true,
        status: true,
        createdAt: true,
      },
    });

    // Move the order into "mockup pending" and record it on the timeline so the
    // customer sees a clear "awaiting your approval" state on their dashboard.
    await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data: { status: 'mockup_pending' },
      }),
      prisma.orderTimeline.create({
        data: {
          orderId: id,
          status: 'mockup_pending',
          note: `Mockup v${revision} sent to customer for approval.`,
          actorId: session.user.id,
        },
      }),
    ]);

    // Build approval URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const approvalUrl = `${appUrl}/approve/${token}`;

    // Send approval email to customer (failures are logged, not fatal)
    if (order.placedBy?.email) {
      await sendArtworkApprovalEmail(
        order.placedBy.email,
        order.placedBy.name || 'Customer',
        approvalUrl,
        order.orderNumber
      );
    }

    return NextResponse.json(
      {
        success: true,
        approval: {
          id: approval.id,
          revision: approval.revision,
          token: approval.token,
          fileUrl: approval.fileUrl,
          expiresAt: approval.expiresAt,
          status: approval.status,
          createdAt: approval.createdAt,
        },
        approvalUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading mockup:', error);
    return NextResponse.json(
      { error: 'Failed to upload mockup' },
      { status: 500 }
    );
  }
}

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

    // Fetch all artwork approvals for this order
    const approvals = await prisma.artworkApproval.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        revision: true,
        fileUrl: true,
        status: true,
        revisionNotes: true,
        approvedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ approvals }, { status: 200 });
  } catch (error) {
    console.error('Error fetching mockups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mockups' },
      { status: 500 }
    );
  }
}
