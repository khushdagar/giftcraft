import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { renderToBuffer } from '@react-pdf/renderer';
import React, { ReactElement } from 'react';
import { SpecSheetPDF } from '@/components/admin/orders/spec-sheet-pdf';

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
    const pdfElement = React.createElement(SpecSheetPDF, {
      order: order as any,
    }) as any;
    const buffer = await renderToBuffer(pdfElement);

    // Return PDF
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="SpecSheet_${order.orderNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating spec sheet:', error);
    return NextResponse.json(
      { error: 'Failed to generate spec sheet' },
      { status: 500 }
    );
  }
}
