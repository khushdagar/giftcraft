import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { uploadToDigitalOcean } from '@/lib/upload';
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

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Image file is required' },
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

    // Upload image to Digital Ocean Spaces
    const fileUrl = await uploadToDigitalOcean(imageFile, 'mockups');

    // Generate unique approval token
    const token = nanoid(16);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours from now

    // Create ArtworkApproval record
    const approval = await prisma.artworkApproval.create({
      data: {
        orderId: id,
        fileUrl: fileUrl || null,
        token,
        expiresAt,
        status: 'pending',
      },
      select: {
        id: true,
        token: true,
        fileUrl: true,
        expiresAt: true,
        status: true,
        createdAt: true,
      },
    });

    // Build approval URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const approvalUrl = `${appUrl}/approve/${token}`;

    // Send approval email to customer
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
