import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pincodeToStateCode } from '@/lib/pincode-to-state';
import { computeShipping } from '@/lib/shipping';
import { getShiprocketShippingCost } from '@/lib/shipping-rate';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pincode = searchParams.get('pincode');
    // Optional context for a weight-based estimate. When omitted, only the
    // zone's rate config is returned (no concrete cost).
    const weightKg = Number(searchParams.get('weightKg') || '0');
    // Total volumetric weight of the order (kg) — (L×W×H)/5000 summed over packs.
    // Couriers bill the greater of dead weight and volumetric weight.
    const volumetricKg = Number(searchParams.get('volumetricKg') || '0');
    const packQuantity = Number(searchParams.get('packQuantity') || '0');
    const orderSubtotal = Number(searchParams.get('subtotal') || '0');
    const deliveryMode =
      searchParams.get('mode') === 'individual' ? 'individual' : 'single';

    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return NextResponse.json(
        { error: 'Invalid pincode format. Must be 6 digits.' },
        { status: 422 }
      );
    }

    const stateCode = pincodeToStateCode(pincode);
    if (!stateCode) {
      return NextResponse.json(
        { error: 'Pincode area not recognized' },
        { status: 422 }
      );
    }

    const zone = await prisma.shippingZone.findFirst({
      where: {
        states: { has: stateCode },
        isActive: true,
      },
    });

    if (!zone) {
      return NextResponse.json(
        { error: 'No shipping zone configured for this area' },
        { status: 404 }
      );
    }

    // Weight-based rate config (SOW: ₹/kg per zone). Fall back to the legacy
    // flat rate as the minimum charge if no per-kg rate is configured yet.
    const ratePerKg = Number(zone.ratePerKg) || 0;
    const minCharge = Number(zone.minCharge) || Number(zone.flatRate) || 0;
    const freeShippingThreshold =
      zone.freeShippingThreshold != null ? Number(zone.freeShippingThreshold) : null;
    const individualSurchargePct = Number(zone.individualSurchargePct) || 0;

    // Concrete cost only when we know the parcel weight. Bill on the GREATER of
    // dead weight and volumetric weight per pack (courier standard).
    const packs = packQuantity > 0 ? packQuantity : 1;
    const perPackDeadKg = weightKg / packs;
    const perPackVolKg = volumetricKg / packs;
    const perPackKg = Math.max(perPackDeadKg, perPackVolKg);
    const zoneEstimate =
      weightKg > 0
        ? computeShipping({
            ratePerKg,
            minCharge,
            freeShippingThreshold,
            individualSurchargePct,
            perPackWeightKg: perPackKg,
            packQuantity: packQuantity || 1,
            deliveryMode,
            orderSubtotal,
          })
        : null;

    // Prefer Shiprocket's real-time courier rate; fall back to the zone estimate.
    let shippingCost = zoneEstimate ? zoneEstimate.shippingCost : null;
    let perPackCost = zoneEstimate ? zoneEstimate.perPackCost : null;
    let source: 'shiprocket' | 'zone' | null = zoneEstimate ? 'zone' : null;
    let courierName: string | null = null;

    if (weightKg > 0) {
      const live = await getShiprocketShippingCost({
        deliveryPincode: pincode,
        perPackKg,
        packQuantity: packQuantity || 1,
        deliveryMode,
      });
      if (live) {
        shippingCost = live.shippingCost;
        perPackCost = live.perPackCost;
        source = 'shiprocket';
        courierName = live.courierName;
      }
    }

    return NextResponse.json({
      zoneName: zone.name,
      stateCode,
      // Weight-based rate config (used for the zone fallback)
      ratePerKg,
      minCharge,
      freeShippingThreshold,
      individualSurchargePct,
      // Legacy field retained for back-compat with older clients.
      flatRate: Number(zone.flatRate),
      // Computed cost for this parcel (null when weight unknown)
      shippingCost,
      perPackCost,
      billableWeightKg: zoneEstimate ? zoneEstimate.billableWeightKg : null,
      isFree: zoneEstimate ? zoneEstimate.isFree : false,
      // Where the rate came from + chosen courier (when Shiprocket)
      source,
      courierName,
      etaMinDays: zone.etaMinDays,
      etaMaxDays: zone.etaMaxDays,
    });
  } catch (error) {
    console.error('Error estimating shipping:', error);
    return NextResponse.json(
      { error: 'Failed to estimate shipping' },
      { status: 500 }
    );
  }
}
