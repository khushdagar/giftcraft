import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { trackShipment, mapShiprocketStatus } from '@/lib/shiprocket';

/**
 * Manually pull the latest tracking from Shiprocket for one order and sync it.
 * Complements the hourly tracker worker — lets admins force a refresh on demand.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, awbCode: true, courierName: true, trackingUrl: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (!order.awbCode) {
      return NextResponse.json(
        { error: 'No AWB yet — create the shipment first.' },
        { status: 400 }
      );
    }

    const tracking = await trackShipment(order.awbCode);
    if (!tracking.length) {
      return NextResponse.json({
        success: true,
        updated: false,
        message: 'No tracking activity from Shiprocket yet.',
      });
    }

    // Latest scan is the current status.
    const latest = tracking[tracking.length - 1]!;
    const newStatus = mapShiprocketStatus(latest.status);

    // Keep the tracking record fresh regardless of whether the order status moves.
    await prisma.shipmentTracking.upsert({
      where: { awbCode: order.awbCode },
      create: {
        orderId: order.id,
        awbCode: order.awbCode,
        courierName: order.courierName ?? undefined,
        status: latest.status,
        currentLocation: latest.location,
        trackingUrl: order.trackingUrl ?? `https://shiprocket.co/tracking/${order.awbCode}`,
      },
      update: {
        status: latest.status,
        currentLocation: latest.location,
        ...(newStatus === 'delivered' ? { deliveredAt: new Date() } : {}),
      },
    });

    let updated = false;
    if (newStatus && newStatus !== order.status) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: newStatus as never },
      });
      await prisma.orderTimeline.create({
        data: {
          orderId: order.id,
          status: newStatus as never,
          note: `Tracking refreshed: ${latest.status}${latest.location ? ` at ${latest.location}` : ''}`,
        },
      });
      updated = true;
    }

    return NextResponse.json({
      success: true,
      updated,
      status: newStatus ?? order.status,
      latest: { status: latest.status, location: latest.location, timestamp: latest.timestamp },
    });
  } catch (error) {
    console.error('Refresh tracking error:', error);
    return NextResponse.json({ error: 'Failed to refresh tracking' }, { status: 500 });
  }
}
