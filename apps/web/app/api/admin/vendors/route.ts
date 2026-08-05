import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { zEmail, zGstin, zPhone } from '@/lib/zod-fields';

const num = z.coerce.number().int().nonnegative().nullable().optional();

const CreateVendorSchema = z.object({
  code: z.string().trim().optional().nullable(),
  name: z.string().min(2, 'Name required').max(100),
  slug: z.string().trim().optional().nullable(),
  type: z.string().optional().nullable(),
  productsServices: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  email: zEmail.optional().nullable().or(z.literal('')),
  phone: zPhone.optional().nullable().or(z.literal('')),
  whatsapp: zPhone.optional().nullable().or(z.literal('')),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  gst: zGstin.optional().nullable().or(z.literal('')),
  paymentTerms: z.string().optional().nullable(),
  avgLeadDays: num,
  minOrderQty: num,
  qualityRating: z.coerce.number().int().min(1).max(5).nullable().optional(),
  reliabilityRating: z.coerce.number().int().min(1).max(5).nullable().optional(),
  creditDays: num,
  onboardingStatus: z.string().optional().nullable(),
  gstKycReceived: z.boolean().optional(),
  bankDetailsReceived: z.boolean().optional(),
  agreementSigned: z.boolean().optional(),
  samplesReceived: z.boolean().optional(),
  lastUsedAt: z.string().optional().nullable(),
  onboardedAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = CreateVendorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ') },
        { status: 400 }
      );
    }
    const d = parsed.data;

    // Ensure a unique slug
    let slug = (d.slug && d.slug.trim()) || slugify(d.name);
    if (!slug) slug = `vendor`;
    if (await prisma.vendor.findUnique({ where: { slug } })) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const vendor = await prisma.vendor.create({
      data: {
        code: d.code || null,
        name: d.name,
        slug,
        type: d.type || null,
        productsServices: d.productsServices || null,
        contactName: d.contactName || null,
        email: d.email || null,
        phone: d.phone || null,
        whatsapp: d.whatsapp || null,
        city: d.city || null,
        state: d.state || null,
        address: d.address || null,
        gst: d.gst || null,
        paymentTerms: d.paymentTerms || null,
        avgLeadDays: d.avgLeadDays ?? null,
        minOrderQty: d.minOrderQty ?? null,
        qualityRating: d.qualityRating ?? null,
        reliabilityRating: d.reliabilityRating ?? null,
        creditDays: d.creditDays ?? null,
        onboardingStatus: d.onboardingStatus || 'pending',
        gstKycReceived: d.gstKycReceived ?? false,
        bankDetailsReceived: d.bankDetailsReceived ?? false,
        agreementSigned: d.agreementSigned ?? false,
        samplesReceived: d.samplesReceived ?? false,
        lastUsedAt: d.lastUsedAt ? new Date(d.lastUsedAt) : null,
        onboardedAt: d.onboardedAt ? new Date(d.onboardedAt) : null,
        notes: d.notes || null,
        source: 'admin',
      },
    });

    return NextResponse.json({ success: true, data: vendor }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: `A vendor with this ${error.meta?.target ?? 'value'} already exists` },
        { status: 409 }
      );
    }
    console.error('Error creating vendor:', error);
    return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user?.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const vendors = await prisma.vendor.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        vendorScore: { select: { qualityScore: true } },
        _count: { select: { pos: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: vendors });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch vendors' } },
      { status: 500 }
    );
  }
}
