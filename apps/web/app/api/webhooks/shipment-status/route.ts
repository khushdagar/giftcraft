import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapShiprocketStatus } from '@/lib/shiprocket';

// Shiprocket sends the token you configured in the dashboard as a plain header
// (Auth Token Type = "x-api-key"). We compare it against this secret.
// NOTE: the webhook URL must NOT contain the words shiprocket/sr/kr — Shiprocket
// rejects those — which is why this route is /api/webhooks/shipment-status.
const SHIPROCKET_WEBHOOK_SECRET = process.env.SHIPROCKET_WEBHOOK_SECRET || '';

interface WebhookPayload {
  awb?: string;
  current_status?: string;
  shipment_status?: string;
  status?: string;
  order_id?: string;          // Shiprocket internal order id
  channel_order_id?: string;  // the order_id we passed (our orderNumber)
  current_timestamp?: string;
  scans?: Array<{ location?: string; activity?: string; date?: string }>;
}

export async function POST(request: NextRequest) {
  try {
    // Verify the token Shiprocket sends in the x-api-key header.
    const token = request.headers.get('x-api-key');
    if (!SHIPROCKET_WEBHOOK_SECRET || token !== SHIPROCKET_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const payload = (await request.json()) as WebhookPayload;

    const orderNumber = payload.channel_order_id || payload.order_id;
    const rawStatus =
      payload.current_status || payload.shipment_status || payload.status || '';

    if (!orderNumber) {
      return NextResponse.json({ success: true }); // ack — nothing to match
    }

    const order = await prisma.order.findFirst({
      where: { orderNumber },
      select: { id: true, status: true },
    });

    if (!order) {
      console.warn(`Shiprocket webhook: order not found for ${orderNumber}`);
      return NextResponse.json({ success: true }); // ack to stop retries
    }

    const newStatus = mapShiprocketStatus(rawStatus);

    // Unknown/unmapped status — acknowledge but don't change the order.
    if (!newStatus || newStatus === order.status) {
      return NextResponse.json({ success: true });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { status: newStatus as never },
    });

    const location = payload.scans?.[payload.scans.length - 1]?.location ?? '';
    await prisma.orderTimeline.create({
      data: {
        orderId: order.id,
        status: newStatus as never,
        note: `Shiprocket update: ${rawStatus}${location ? ` at ${location}` : ''}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Shiprocket webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
