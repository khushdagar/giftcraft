import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { perPackVolumetricKg, perPackWeightKg } from '@/lib/shipping';
import { GET as estimateShipping } from '@/app/api/shipping/estimate/route';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  pincode: z.string().regex(/^\d{6}$/, 'Enter a 6-digit pincode'),
  productIds: z.array(z.string()).min(1, 'Add products first').max(100),
  packQuantity: z.number().int().min(1).max(1000000),
});

/**
 * POST /api/admin/proposals/shipping
 * Real shipping cost for a proposal pack delivered to a pincode. Weights and
 * dimensions come from the DB (the builder's product list doesn't carry them),
 * then it runs the exact estimate the customer builder uses — Shiprocket live
 * rate, zone pricing as the fallback — so the proposal quotes what checkout would.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { pincode, productIds, packQuantity } = bodySchema.parse(await req.json());
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { weightG: true, dimensionL: true, dimensionW: true, dimensionH: true },
    });
    if (products.length === 0) {
      return NextResponse.json({ success: false, error: 'Add products first' }, { status: 400 });
    }

    // Same maths as the customer builder (one of each product per pack).
    const lines = products.map((p) => ({ ...p, quantity: 1 }));
    const params = new URLSearchParams({
      pincode,
      weightKg: String(perPackWeightKg(lines) * packQuantity),
      volumetricKg: String(perPackVolumetricKg(lines) * packQuantity),
      packQuantity: String(packQuantity),
      mode: 'single',
    });
    const res = await estimateShipping(
      new NextRequest(new URL(`/api/shipping/estimate?${params}`, req.url))
    );
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ success: false, error: data.error || 'Unable to price shipping' }, { status: 422 });
    }
    if (data.serviceable === false) {
      return NextResponse.json({
        success: false,
        error:
          data.reason === 'unserviceable'
            ? "Couriers don't deliver to this pincode."
            : "Delivery isn't available to this pincode yet.",
      }, { status: 422 });
    }
    if (data.shippingCost == null) {
      return NextResponse.json({ success: false, error: 'Unable to price shipping' }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      data: {
        shippingCost: Number(data.shippingCost),
        courierName: data.courierName ?? null,
        source: data.source,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Invalid input' }, { status: 400 });
    }
    console.error('Proposal shipping error:', error);
    return NextResponse.json({ success: false, error: 'Failed to price shipping' }, { status: 500 });
  }
}
