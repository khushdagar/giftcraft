import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { zPersonName, zPhone, zPincode } from '@/lib/zod-fields';

const addressSchema = z.object({
  label: z.string().trim().max(60).optional().or(z.literal('')),
  contactName: zPersonName('Contact name').max(120),
  company: z.string().trim().max(200).optional().or(z.literal('')),
  addressLine1: z.string().trim().min(5, 'Address must be at least 5 characters').max(300),
  addressLine2: z.string().trim().max(300).optional().or(z.literal('')),
  city: zPersonName('City').max(120),
  state: z.string().trim().min(2, 'State is required').max(120),
  pincode: zPincode,
  phone: zPhone.optional().or(z.literal('')),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const addresses = await prisma.savedAddress.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ success: true, data: addresses });
  } catch (error) {
    console.error('GET /api/dashboard/addresses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const parsed = addressSchema.parse(body);

    // First saved address is default automatically.
    const count = await prisma.savedAddress.count({ where: { userId } });
    const makeDefault = parsed.isDefault || count === 0;

    const created = await prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.savedAddress.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }
      return tx.savedAddress.create({
        data: {
          userId,
          label: parsed.label || null,
          contactName: parsed.contactName,
          company: parsed.company || null,
          addressLine1: parsed.addressLine1,
          addressLine2: parsed.addressLine2 || null,
          city: parsed.city,
          state: parsed.state,
          pincode: parsed.pincode,
          phone: parsed.phone || null,
          isDefault: makeDefault,
        },
      });
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }
    console.error('POST /api/dashboard/addresses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
