import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { zEmail, zGstin, zPersonName, zPhone } from '@/lib/zod-fields';
import { sendPushToAdmins } from '@/lib/push';

/**
 * POST /api/vendors/register
 * Public "Sell With Us" vendor onboarding form (SOW Stage 1).
 * Creates a Vendor lead with onboardingStatus='pending' and source='self_registration'.
 * No login account is created — the admin reviews and promotes the vendor later.
 */
const RegisterVendorSchema = z.object({
  name: zPersonName('Company name'),
  contactName: zPersonName('Contact name'),
  email: zEmail,
  phone: zPhone,
  whatsapp: zPhone.optional().nullable().or(z.literal('')),
  city: z.string().max(50).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  type: z.string().max(100).optional().nullable(),
  productsServices: z.string().max(2000).optional().nullable(),
  gst: zGstin.optional().nullable().or(z.literal('')),
  paymentTerms: z.string().max(200).optional().nullable(),
  avgLeadDays: z.number().int().nonnegative().nullable().optional(),
  minOrderQty: z.number().int().nonnegative().nullable().optional(),
  notes: z.string().max(2000).optional().nullable(),
});

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RegisterVendorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join('; ') },
        { status: 400 }
      );
    }
    const d = parsed.data;

    let slug = slugify(d.name) || 'vendor';
    if (await prisma.vendor.findUnique({ where: { slug } })) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const vendor = await prisma.vendor.create({
      data: {
        name: d.name,
        slug,
        contactName: d.contactName,
        email: d.email,
        phone: d.phone,
        whatsapp: d.whatsapp || null,
        city: d.city || null,
        state: d.state || null,
        address: d.address || null,
        type: d.type || null,
        productsServices: d.productsServices || null,
        gst: d.gst || null,
        paymentTerms: d.paymentTerms || null,
        avgLeadDays: d.avgLeadDays ?? null,
        minOrderQty: d.minOrderQty ?? null,
        notes: d.notes || null,
        onboardingStatus: 'pending',
        source: 'self_registration',
      },
      select: { id: true, name: true },
    });

    sendPushToAdmins({
      title: `Vendor application: ${vendor.name}`,
      body: [d.type, d.city].filter(Boolean).join(' — ') || 'Awaiting review',
      url: `/admin/vendors/${vendor.id}`,
      tag: `vendor-${vendor.id}`,
    }).catch(() => {});

    return NextResponse.json({ success: true, data: vendor }, { status: 201 });
  } catch (error) {
    console.error('Vendor self-registration failed:', error);
    return NextResponse.json(
      { error: 'Could not submit your application. Please try again.' },
      { status: 500 }
    );
  }
}
