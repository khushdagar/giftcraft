import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * POST /api/vendors/register
 * Public "Sell With Us" vendor onboarding form (SOW Stage 1).
 * Creates a Vendor lead with onboardingStatus='pending' and source='self_registration'.
 * No login account is created — the admin reviews and promotes the vendor later.
 */
const RegisterVendorSchema = z.object({
  name: z.string().min(2, 'Company name is required').max(100),
  contactName: z.string().min(2, 'Contact name is required').max(100),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(8, 'Phone number is required').max(20),
  whatsapp: z.string().max(20).optional().nullable(),
  city: z.string().max(50).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  type: z.string().max(100).optional().nullable(),
  productsServices: z.string().max(2000).optional().nullable(),
  gst: z.string().max(20).optional().nullable(),
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

    return NextResponse.json({ success: true, data: vendor }, { status: 201 });
  } catch (error) {
    console.error('Vendor self-registration failed:', error);
    return NextResponse.json(
      { error: 'Could not submit your application. Please try again.' },
      { status: 500 }
    );
  }
}
