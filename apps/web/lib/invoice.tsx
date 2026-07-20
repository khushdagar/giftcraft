import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDF, type InvoiceData } from '@/components/orders/invoice-pdf';
import { isOrderFullyPaid } from '@/lib/invoice-status';

/**
 * Minimal shape needed to build an invoice — a Prisma Order with its items and
 * each item's product name. Decimal fields are read via Number().
 */
export interface InvoiceOrder {
  orderNumber: string;
  createdAt: Date;
  paidAt: Date | null;
  billingJson: any;
  packQuantity: number;
  subtotal: any;
  packagingAmount: any;
  addonsAmount: any;
  shippingAmount: any;
  discountAmount: any;
  cgstAmount: any;
  sgstAmount: any;
  igstAmount: any;
  razorpayFee: any;
  grandTotal: any;
  items: {
    product: { name: string } | null;
    hsnCode: string | null;
    gstRate: any;
    quantity: number;
    unitPrice: any;
    totalPrice: any;
  }[];
}

/**
 * Build the InvoiceData payload from an order. Produces a Proforma Invoice until
 * the order is fully paid, then a Tax Invoice. Shared by the invoice download
 * route and the order-confirmation email attachment.
 */
export function buildInvoiceData(order: InvoiceOrder): InvoiceData {
  const billing = (order.billingJson as any) || {};
  const buyerAddress = [billing.address1, billing.address2, billing.city, billing.pincode]
    .filter(Boolean)
    .join(', ');

  // A 10% advance does NOT make this a full Tax Invoice — it stays a Proforma
  // (showing advance paid + balance pending) until the order is fully paid.
  const grandTotal = Number(order.grandTotal);
  const amountPaid = Number(billing.amountPaid ?? 0);
  const isFullyPaid = isOrderFullyPaid(amountPaid, grandTotal);

  return {
    invoiceNumber: `INV-${order.orderNumber}`,
    invoiceDate: (order.paidAt ?? order.createdAt).toISOString(),
    isPaid: isFullyPaid,
    payment: {
      amountPaid,
      paymentType: billing.paymentType ?? null,
      paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    },
    seller: {
      name: 'Arts Shala',
      gstin: process.env.SELLER_GSTIN || '07AAAAA0000A1Z5',
      stateCode: process.env.SELLER_STATE_CODE || 'DL',
      address: 'New Delhi, India',
    },
    buyer: {
      companyName: billing.companyName || billing.name || '—',
      gstin: billing.gstin || null,
      address: buyerAddress,
      state: billing.state || '',
      email: billing.email || null,
      phone: billing.phone || null,
    },
    items: order.items.map((it) => ({
      name: it.product?.name || 'Product',
      hsnCode: it.hsnCode,
      gstRate: it.gstRate != null ? Number(it.gstRate) : null,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      taxableValue: Number(it.totalPrice),
    })),
    packQuantity: order.packQuantity,
    amounts: {
      subtotal: Number(order.subtotal),
      packaging: Number(order.packagingAmount),
      addons: Number(order.addonsAmount),
      shipping: Number(order.shippingAmount),
      discount: Number(order.discountAmount),
      cgst: Number(order.cgstAmount),
      sgst: Number(order.sgstAmount),
      igst: Number(order.igstAmount),
      razorpayFee: Number(order.razorpayFee),
      grandTotal: Number(order.grandTotal),
    },
  };
}

/** Render the invoice for an order to a PDF Buffer (for email attachment). */
export async function renderInvoiceBuffer(order: InvoiceOrder): Promise<Buffer> {
  const data = buildInvoiceData(order);
  return (await renderToBuffer(<InvoicePDF data={data} />)) as Buffer;
}
