import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pincodeToStateCode } from '@/lib/pincode-to-state';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pincode = searchParams.get('pincode');
    // weightG is accepted for future use but not used yet
    const _weightG = searchParams.get('weightG');

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

    return NextResponse.json({
      zoneName: zone.name,
      stateCode,
      flatRate: Number(zone.flatRate),
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
