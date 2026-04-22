import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serializeHsnCode } from '@/lib/serialize';

export async function GET() {
  try {
    const hsns = await prisma.hsnCode.findMany({
      orderBy: { code: 'asc' },
    });

    const serialized = hsns.map((hsn) => ({
      id: hsn.id,
      code: hsn.code,
      description: hsn.description,
      gstRate: Number(hsn.defaultGstRate),
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    console.error('Error fetching HSN codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch HSN codes' },
      { status: 500 }
    );
  }
}
