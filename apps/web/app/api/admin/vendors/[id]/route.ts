import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { zEmail, zGstin, zPhone } from '@/lib/zod-fields';

const UpdateVendorSchema = z.object({
  code: z.string().nullable().optional(),
  name: z.string().min(2).max(100).optional(),
  type: z.string().nullable().optional(),
  productsServices: z.string().nullable().optional(),
  contactName: z.string().min(2).max(100).optional(),
  email: zEmail.optional(),
  phone: zPhone.optional(),
  whatsapp: zPhone.nullable().optional().or(z.literal('')),
  city: z.string().min(2).max(50).optional(),
  state: z.string().length(2).optional(),
  address: z.string().optional(),
  gst: zGstin.optional().or(z.literal('')),
  paymentTerms: z.string().optional(),
  avgLeadDays: z.number().int().nullable().optional(),
  minOrderQty: z.number().int().nullable().optional(),
  qualityRating: z.number().int().min(1).max(5).nullable().optional(),
  reliabilityRating: z.number().int().min(1).max(5).nullable().optional(),
  creditDays: z.number().int().nullable().optional(),
  onboardingStatus: z.string().optional(),
  gstKycReceived: z.boolean().optional(),
  bankDetailsReceived: z.boolean().optional(),
  agreementSigned: z.boolean().optional(),
  samplesReceived: z.boolean().optional(),
  lastUsedAt: z.string().nullable().optional(),
  onboardedAt: z.string().nullable().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
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

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        contactName: true,
        email: true,
        phone: true,
        city: true,
        state: true,
        address: true,
        gst: true,
        paymentTerms: true,
        notes: true,
        isActive: true,
        score: true,
        priceConfirmedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    console.error('Error fetching vendor:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor' },
      { status: 500 }
    );
  }
}

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
    const body = await request.json();
    const validation = UpdateVendorSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { lastUsedAt, onboardedAt, ...rest } = validation.data;
    const updateData: any = { ...rest };
    if (lastUsedAt !== undefined) updateData.lastUsedAt = lastUsedAt ? new Date(lastUsedAt) : null;
    if (onboardedAt !== undefined) updateData.onboardedAt = onboardedAt ? new Date(onboardedAt) : null;

    const vendor = await prisma.vendor.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        contactName: true,
        email: true,
        phone: true,
        city: true,
        state: true,
        address: true,
        gst: true,
        paymentTerms: true,
        notes: true,
        isActive: true,
        score: true,
        priceConfirmedAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    console.error('Error updating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to update vendor' },
      { status: 500 }
    );
  }
}
