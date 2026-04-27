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
      items: order.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
      })),
    };
    const pdfElement = React.createElement(VendorPoPDF, {
      order: orderForPdf as any,
      vendor: {
        name: 'Vendor Name',
        address: 'Vendor Address',
        city: 'Vendor City',
        state: 'Vendor State',
        gst: 'GST Number',
      },
    }) as any;
    const buffer = await renderToBuffer(pdfElement);

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
