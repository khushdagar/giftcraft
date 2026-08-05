import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { stateNameToCode } from '@/lib/pincode-to-state';
import { zGstin, zPan, zPhone, zPincode, zUrl } from '@/lib/zod-fields';

// Optional fields accept '' (cleared), but any non-empty value must be valid.
const companySchema = z.object({
  name: z.string().trim().min(2, 'Company name is required').max(200).optional(),
  gstin: zGstin.optional().or(z.literal('')),
  pan: zPan.optional().or(z.literal('')),
  addressLine: z.string().trim().max(300).optional().or(z.literal('')),
  city: z.string().trim().max(120).optional().or(z.literal('')),
  state: z.string().trim().max(120).optional().or(z.literal('')),
  pincode: zPincode.optional().or(z.literal('')),
  phone: zPhone.optional().or(z.literal('')),
  website: zUrl.optional().or(z.literal('')),
});

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'company';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const company = await prisma.company.findFirst({
      where: { users: { some: { id: session.user.id } } },
    });

    // Every signed-in customer can create/manage their own company profile
    // (SOW §3.7.3). `data: null` means "not set up yet" — the client shows the
    // setup form rather than a read-only view.
    return NextResponse.json({ success: true, data: company, canEdit: true });
  } catch (error) {
    console.error('GET /api/dashboard/company:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const parsed = companySchema.parse(body);

    const nullIfEmpty = (v: string | undefined) =>
      v === undefined ? undefined : v === '' ? null : v;

    const existing = await prisma.company.findFirst({
      where: { users: { some: { id: userId } } },
      select: { id: true },
    });

    // ── Update the user's existing company profile ─────────────────────────
    if (existing) {
      const updated = await prisma.company.update({
        where: { id: existing.id },
        data: {
          ...(parsed.name !== undefined ? { name: parsed.name } : {}),
          gstin: nullIfEmpty(parsed.gstin),
          pan: nullIfEmpty(parsed.pan),
          addressLine: nullIfEmpty(parsed.addressLine),
          city: nullIfEmpty(parsed.city),
          state: nullIfEmpty(parsed.state),
          stateCode:
            parsed.state !== undefined ? stateNameToCode(parsed.state) : undefined,
          pincode: nullIfEmpty(parsed.pincode),
          phone: nullIfEmpty(parsed.phone),
          website: nullIfEmpty(parsed.website),
        },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    // ── First-time setup: create the company and link this user ────────────
    // Per SOW §3.7.1, a customer's account is tied to a company. Self-serve
    // users create theirs here (the signup flow doesn't yet capture it).
    if (!parsed.name || !parsed.name.trim()) {
      return NextResponse.json(
        { error: 'Company name is required to set up your company' },
        { status: 400 }
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: parsed.name!,
          slug: `${slugify(parsed.name!)}-${nanoid(8)}`,
          gstin: parsed.gstin || null,
          pan: parsed.pan || null,
          addressLine: parsed.addressLine || null,
          city: parsed.city || null,
          state: parsed.state || null,
          stateCode: parsed.state ? stateNameToCode(parsed.state) : null,
          pincode: parsed.pincode || null,
          phone: parsed.phone || null,
          website: parsed.website || null,
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { companyId: company.id },
      });
      return company;
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }
    console.error('PATCH /api/dashboard/company:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
