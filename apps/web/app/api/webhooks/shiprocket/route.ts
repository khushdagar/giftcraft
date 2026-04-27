import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

const SHIPROCKET_WEBHOOK_SECRET = process.env.SHIPROCKET_WEBHOOK_SECRET || '';

/**
 * Verify Shiprocket webhook HMAC signature.
 */
function verifyWebhookSignature(body: string, signature: string): boolean {
  const hash = crypto.createHmac('sha256', SHIPROCKET_WEBHOOK_SECRET).update(body).digest('hex');
  return hash === signature;
}

/**
 * Map Shiprocket status to GiftCraft order status.
 */
function mapShiprocketStatus(shiprocketStatus: string): string {
  const statusMap: Record<string, string> = {
    READY_TO_DISPATCH: 'packed',
    CANCELLED: 'cancelled',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    IN_TRANSIT: 'in_transit',
    RETURN_INITIATED: 'cancelled',
    LOST_IN_TRANSIT: 'cancelled',
    DAMAGED_IN_TRANSIT: 'cancelled',
    RETURN_DELIVERED: 'refunded',
  };
  return statusMap[shiprocketStatus] || shiprocketStatus.toLowerCase();
}

interface WebhookPayload {
  event_id: string;
  event_type: string;
  shipment_id: number;
  order_id: string;
  status: string;
  awb_code: string;
  courier_name: string;
  location: string;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-shiprocket-signature');
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    const body = await request.text();

    // Verify HMAC signature
    if (!verifyWebhookSignature(body, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body) as WebhookPayload;

    // Find order by orderNumber (Shiprocket sends order_id as our orderNumber)
    const order = await prisma.order.findFirst({
      where: { orderNumber: payload.order_id },
      select: { id: true, status: true },
    });

    if (!order) {
      // Order not found — still return 200 to acknowledge webhook
      console.warn(`Order not found for Shiprocket webhook: ${payload.order_id}`);
      return NextResponse.json({ success: true });
    }

    // Map status and update order
    const newStatus = mapShiprocketStatus(payload.status);

    // Update order status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: newStatus as any,
      },
    });

    // Create timeline entry
    await prisma.orderTimeline.create({
      data: {
        orderId: order.id,
        status: newStatus as any,
        note: `Shiprocket status update: ${payload.status} at ${payload.location}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
