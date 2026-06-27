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
        shippingJson: true,
        packQuantity: true,
        company: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        placedBy: {
          select: { email: true },
        },
        items: {
          select: {
            id: true,
            product: {
              select: {
                name: true,
                slug: true,
                weightG: true,
                dimensionL: true,
                dimensionW: true,
                dimensionH: true,
              },
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

    // Resolve the real delivery address captured in the builder (Step 3).
    // Shape: { name, company, address1, address2, city, state, pincode, phone }
    const ship = (order.shippingJson ?? {}) as {
      name?: string;
      company?: string;
      address1?: string;
      address2?: string;
      city?: string;
      state?: string;
      pincode?: string;
      phone?: string;
    };

    if (!ship.pincode || !ship.address1 || !ship.city) {
      return NextResponse.json(
        { error: 'Order has no valid delivery address — cannot create shipment.' },
        { status: 400 }
      );
    }

    // Parcel weight: sum(product weight in grams × quantity) → kg.
    // Pack quantity multiplies the per-pack item weights. Min 0.5 kg floor.
    const totalGrams = order.items.reduce(
      (sum, item) => sum + (item.product.weightG ?? 0) * item.quantity,
      0
    ) * (order.packQuantity || 1);
    const weightKg = Math.max(Math.round((totalGrams / 1000) * 100) / 100, 0.5);

    // Parcel box dimensions (cm): take the largest product in each axis as a
    // rough single-box estimate, with a sensible fallback when products lack data.
    const dimsL = order.items.map((i) => i.product.dimensionL ?? 0);
    const dimsW = order.items.map((i) => i.product.dimensionW ?? 0);
    const dimsH = order.items.map((i) => i.product.dimensionH ?? 0);
    const length = Math.max(...dimsL, 0) || 25;
    const breadth = Math.max(...dimsW, 0) || 20;
    const height = Math.max(...dimsH, 0) || 10;

    // Create shipment in Shiprocket
    const shipmentId = await createShipment({
      order_id: order.orderNumber,
      order_date: new Date().toISOString().split('T')[0]!,
      pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Home',
      billing_address_name: ship.name || order.company?.name || 'Customer',
      billing_address_phone: ship.phone || order.company?.phone || '9999999999',
      billing_address_email: order.placedBy?.email || '',
      billing_address: [ship.address1, ship.address2].filter(Boolean).join(', '),
      billing_city: ship.city,
      billing_state: ship.state || '',
      billing_postcode: ship.pincode,
      shipping_is_billing: true,
      order_items: order.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: Number(item.unitPrice),
      })),
      payment_method: 'prepaid',
      sub_total: Number(order.grandTotal),
      length,
      breadth,
      height,
      weight: weightKg,
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
