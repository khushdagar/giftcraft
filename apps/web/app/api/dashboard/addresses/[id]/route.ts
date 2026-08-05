import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { zPersonName, zPhone, zPincode } from '@/lib/zod-fields';

const updateSchema = z.object({
  label: z.string().trim().max(60).optional().or(z.literal('')),
  contactName: zPersonName('Contact name').max(120).optional(),
  company: z.string().trim().max(200).optional().or(z.literal('')),
  addressLine1: z.string().trim().min(5, 'Address must be at least 5 characters').max(300).optional(),
  addressLine2: z.string().trim().max(300).optional().or(z.literal('')),
  city: zPersonName('City').max(120).optional(),
  state: z.string().trim().min(2).max(120).optional(),
  pincode: zPincode.optional(),
  phone: zPhone.optional().or(z.literal('')),
  isDefault: z.boolean().optional(),
});

async function ownedAddress(userId: string, id: string) {
  return prisma.savedAddress.findFirst({ where: { id, userId }, select: { id: true } });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const existing = await ownedAddress(userId, params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateSchema.parse(body);
    const nullIfEmpty = (v: string | undefined) =>
      v === undefined ? undefined : v === '' ? null : v;

    const updated = await prisma.$transaction(async (tx) => {
      if (parsed.isDefault === true) {
        await tx.savedAddress.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }
      return tx.savedAddress.update({
        where: { id: params.id },
        data: {
          label: nullIfEmpty(parsed.label),
          ...(parsed.contactName !== undefined ? { contactName: parsed.contactName } : {}),
          company: nullIfEmpty(parsed.company),
          ...(parsed.addressLine1 !== undefined ? { addressLine1: parsed.addressLine1 } : {}),
          addressLine2: nullIfEmpty(parsed.addressLine2),
          ...(parsed.city !== undefined ? { city: parsed.city } : {}),
          ...(parsed.state !== undefined ? { state: parsed.state } : {}),
          ...(parsed.pincode !== undefined ? { pincode: parsed.pincode } : {}),
          phone: nullIfEmpty(parsed.phone),
          ...(parsed.isDefault !== undefined ? { isDefault: parsed.isDefault } : {}),
        },
      });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }
    console.error('PATCH /api/dashboard/addresses/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const existing = await prisma.savedAddress.findFirst({
      where: { id: params.id, userId },
      select: { id: true, isDefault: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    await prisma.savedAddress.delete({ where: { id: params.id } });

    // Promote another address to default if we removed the default one.
    if (existing.isDefault) {
      const next = await prisma.savedAddress.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (next) {
        await prisma.savedAddress.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/dashboard/addresses/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
