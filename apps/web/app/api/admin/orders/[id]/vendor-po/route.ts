import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { renderToBuffer } from '@react-pdf/renderer';
import React, { ReactElement } from 'react';
import { VendorPoPDF } from '@/components/admin/orders/vendor-po-pdf';

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

    // Fetch order with all required data
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        grandTotal: true,
        deliveryDate: true,
        billingJson: true,
        company: {
          select: { name: true },
        },
        items: {
          select: {
            id: true,
            product: {
              select: { name: true, slug: true },
            },
            quantity: true,
            unitPrice: true,
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

    // Generate PDF
    const orderForPdf = {
      ...order,
      grandTotal: Number(order.grandTotal),
      items: order.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
      })),
    };
    // Self-serve orders have no Company row, so fall back to the billing details
    // the customer entered at checkout — same order of preference as the invoice.
    const billing = (order.billingJson as any) || {};
    // NOTE: vendor details are still placeholders — no Product→Vendor relation
    // exists yet, so there is nothing to resolve them from (vendor sourcing is
    // Stage 3, CLAUDE.md §4 Rule 8).
    const pdfElement = React.createElement(VendorPoPDF, {
      order: orderForPdf,
      clientName: billing.companyName || billing.name || undefined,
      vendor: {
        name: 'Vendor Name',
        address: 'Vendor Address',
        city: 'Vendor City',
        state: 'Vendor State',
        gst: 'GST Number',
      },
    });
    const buffer = await renderToBuffer(pdfElement as any);

    // Return PDF
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="PO_${order.orderNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating vendor PO:', error);
    return NextResponse.json(
      { error: 'Failed to generate PO' },
      { status: 500 }
    );
  }
}
