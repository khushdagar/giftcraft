import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generateEInvoice, saveEInvoice } from '@/lib/einvoice';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const einvoice = await prisma.gstEinvoice.findUnique({
      where: { orderId: params.id },
    });

    if (!einvoice) {
      return NextResponse.json({ error: 'E-Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: einvoice });
  } catch (error) {
    console.error('GET /api/admin/orders/[id]/einvoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = params.id;

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, gstBillType: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Only generate e-invoice for confirmed or completed orders
    if (!['confirmed', 'shipped', 'delivered', 'completed'].includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot generate e-invoice for order in ${order.status} status` },
        { status: 400 }
      );
    }

    // Only B2B orders need e-invoice
    if (order.gstBillType !== 'B2B') {
      return NextResponse.json(
        { error: 'E-Invoicing is only available for B2B orders' },
        { status: 400 }
      );
    }

    // Generate e-invoice
    const invoiceData = await generateEInvoice(orderId);

    if (!invoiceData) {
      return NextResponse.json(
        { error: 'Failed to generate e-invoice' },
        { status: 500 }
      );
    }

    // Save to database
    await saveEInvoice(orderId, invoiceData);

    // Fetch and return the saved record
    const saved = await prisma.gstEinvoice.findUnique({
      where: { orderId },
    });

    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/orders/[id]/einvoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
