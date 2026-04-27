import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createShipment, getAWB } from '@/lib/shiprocket';
import { sendOrderShippedEmail } from '@/lib/email';

export async function PATCH(
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

    // Fetch order with required data
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        company: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
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
        deliveryDate: true,
        grandTotal: true,
        shiprocketOrderId: true,
        awbCode: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.shiprocketOrderId && order.awbCode) {
      return NextResponse.json(
        { error: 'Shipment already created for this order' },
        { status: 400 }
      );
    }

    // Create shipment in Shiprocket
    const shipmentId = await createShipment({
      order_id: order.orderNumber,
      order_date: new Date().toISOString().split('T')[0]!,
      pickup_location_id: 1, // Default pickup location — parameterize if needed
      billing_address_name: order.company?.name || 'Company',
      billing_address_phone: order.company?.phone || '9999999999',
      billing_address_email: '',
      billing_address: 'GiftCraft, Delhi', // Default — should come from order
      billing_city: 'Delhi',
      billing_state: 'DL',
      billing_postcode: '110001',
      shipping_is_billing: true,
      order_items: order.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: Number(item.unitPrice),
      })),
      payment_method: 'prepaid',
      sub_total: Number(order.grandTotal),
      weight: 1, // Default weight — should be calculated from product data
    });

    // Get AWB for shipment
    const { awbCode, courierName } = await getAWB(shipmentId);

    // Generate tracking URL (format: https://track.giftcraft.in/[awbCode])
    const trackingUrl = `https://track.giftcraft.in/${awbCode}`;

    // Update order with Shiprocket data
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        shiprocketOrderId: String(shipmentId),
        awbCode,
        courierName,
        trackingUrl,
      },
      select: {
        id: true,
        orderNumber: true,
        company: {
          select: { phone: true, name: true },
        },
      },
    });

    // Create timeline entry
    await prisma.orderTimeline.create({
      data: {
        orderId: id,
        status: 'shipped',
        note: `Shipment created in Shiprocket. AWB: ${awbCode}, Courier: ${courierName}`,
      },
    });

    // Send confirmation email to customer
    try {
      await sendOrderShippedEmail({
        orderNumber: order.orderNumber,
        companyName: order.company?.name || 'Company',
        companyEmail: '',
        awbCode,
        courierName,
        trackingUrl,
      });
    } catch (emailError) {
      console.error('Error sending shipment email:', emailError);
      // Don't fail the API if email fails
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: id,
        shipmentId,
        awbCode,
        courierName,
        trackingUrl,
      },
    });
  } catch (error) {
    console.error('Error creating shipment:', error);
    return NextResponse.json(
      { error: 'Failed to create shipment' },
      { status: 500 }
    );
  }
}
