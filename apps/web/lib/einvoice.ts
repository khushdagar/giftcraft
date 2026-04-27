import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

interface EInvoicePayload {
  orderId: string;
  orderNumber: string;
  sellerGstin: string;
  sellerName: string;
  buyerGstin: string | undefined;
  buyerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: Decimal;
  sgstAmount: Decimal;
  cgstAmount: Decimal;
  igstAmount: Decimal;
}

interface EInvoiceResponse {
  irn: string;
  ackNumber: string;
  ackDate: string;
  qrPayload: string;
}

export async function generateEInvoice(orderId: string): Promise<EInvoiceResponse | null> {
  try {
    // Check if invoice already exists
    const existing = await prisma.gstEinvoice.findUnique({
      where: { orderId },
    });

    if (existing && existing.irn) {
      return {
        irn: existing.irn,
        ackNumber: existing.ackNumber || '',
        ackDate: existing.ackDate?.toISOString() || '',
        qrPayload: existing.qrPayload || '',
      };
    }

    // Fetch order data
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        company: true,
      },
    });

    if (!order || !order.company) {
      throw new Error('Order or company not found');
    }

    const payload: EInvoicePayload = {
      orderId,
      orderNumber: order.orderNumber,
      sellerGstin: process.env.SELLER_GSTIN || '07AAAA0000A1Z5',
      sellerName: 'Arts Shala',
      buyerGstin: order.company.gstin || undefined,
      buyerName: order.company.name,
      invoiceNumber: order.orderNumber,
      invoiceDate: order.createdAt.toISOString().split('T')[0]!!,
      totalAmount: order.grandTotal,
      sgstAmount: order.sgstAmount,
      cgstAmount: order.cgstAmount,
      igstAmount: order.igstAmount,
    };

    // Use sandbox mode if enabled
    if (process.env.EINVOICE_SANDBOX === 'true') {
      return generateMockEInvoice(payload);
    }

    // Call real IRP API (not implemented yet)
    // For now, fall back to mock
    return generateMockEInvoice(payload);
  } catch (error) {
    console.error('Error generating e-invoice:', error);
    return null;
  }
}

function generateMockEInvoice(payload: EInvoicePayload): EInvoiceResponse {
  const irn = `DEMO-IRN-${payload.orderId}`;
  const ackNumber = Math.random().toString(36).substring(7).toUpperCase();

  // Create QR payload (base64-encoded JSON of invoice fields)
  const qrData = {
    irn,
    ackNumber,
    orderNumber: payload.orderNumber,
    invoiceDate: payload.invoiceDate,
    totalAmount: payload.totalAmount.toNumber(),
  };

  const qrPayload = Buffer.from(JSON.stringify(qrData)).toString('base64');

  return {
    irn,
    ackNumber,
    ackDate: new Date().toISOString().split('T')[0]!,
    qrPayload,
  };
}

export async function saveEInvoice(
  orderId: string,
  invoiceData: EInvoiceResponse
): Promise<void> {
  const existing = await prisma.gstEinvoice.findUnique({
    where: { orderId },
  });

  if (existing) {
    await prisma.gstEinvoice.update({
      where: { orderId },
      data: {
        irn: invoiceData.irn,
        ackNumber: invoiceData.ackNumber,
        ackDate: new Date(invoiceData.ackDate),
        qrPayload: invoiceData.qrPayload,
        status: 'generated',
      },
    });
  } else {
    await prisma.gstEinvoice.create({
      data: {
        orderId,
        irn: invoiceData.irn,
        ackNumber: invoiceData.ackNumber,
        ackDate: new Date(invoiceData.ackDate),
        qrPayload: invoiceData.qrPayload,
        status: 'generated',
      },
    });
  }
}
