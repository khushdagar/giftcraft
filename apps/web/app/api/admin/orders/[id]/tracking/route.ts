import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    // Admin only endpoint
    if (!session || session.user?.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const orderId = params.id;

    // Fetch order with shipment tracking
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        awbCode: true,
        courierName: true,
        trackingUrl: true,
        shipmentTracking: true,
        createdAt: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } },
        { status: 404 }
      );
    }

    // If no shipment tracking yet, return order info only
    if (!order.shipmentTracking && !order.awbCode) {
      return NextResponse.json({
        success: true,
        data: {
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            createdAt: order.createdAt,
          },
          tracking: null,
          message: 'Order not yet shipped',
        },
      });
    }

    // Return tracking information
    return NextResponse.json({
      success: true,
      data: {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          createdAt: order.createdAt,
        },
        tracking: {
          awbCode: order.awbCode,
          courierName: order.courierName,
          trackingUrl: order.trackingUrl,
          currentLocation: order.shipmentTracking?.currentLocation || null,
          status: order.shipmentTracking?.status || 'pending',
          estimatedDelivery: order.shipmentTracking?.estimatedDelivery || null,
          deliveredAt: order.shipmentTracking?.deliveredAt || null,
          updatedAt: order.shipmentTracking?.updatedAt || null,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching tracking:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tracking' } },
      { status: 500 }
    );
  }
}
