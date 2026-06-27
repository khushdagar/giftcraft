import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const num = z.coerce.number().int().nonnegative().nullable().optional();

const BulkVendorSchema = z.object({
  code: z.string().trim().optional().nullable(),
  name: z.string().min(2, 'Name required').max(100),
  slug: z.string().trim().optional().nullable(),
  type: z.string().optional().nullable(),
  productsServices: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  gst: z.string().optional().nullable(),
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

const BulkRequestSchema = z.object({
  vendors: z.array(BulkVendorSchema).min(1, 'At least one vendor required').max(500),
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
    const parsed = BulkRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ') },
        { status: 400 }
      );
    }

    const { vendors } = parsed.data;

    // Preload existing codes & slugs so we can dedupe and avoid unique-constraint failures.
    const existing = await prisma.vendor.findMany({ select: { code: true, slug: true } });
    const existingCodes = new Set(existing.map((v) => v.code).filter(Boolean) as string[]);
    const usedSlugs = new Set(existing.map((v) => v.slug));

    const created: { code: string | null; name: string }[] = [];
    const skipped: { name: string; reason: string }[] = [];
    const errors: { name: string; reason: string }[] = [];

    for (const d of vendors) {
      const code = d.code?.trim() || null;

      // Skip vendors whose code already exists (idempotent re-imports).
      if (code && existingCodes.has(code)) {
        skipped.push({ name: d.name, reason: `Code ${code} already exists` });
        continue;
      }

      // Generate a unique slug (against DB + this batch).
      let base = (d.slug && d.slug.trim()) || slugify(d.name);
      if (!base) base = 'vendor';
      let slug = base;
      let n = 2;
      while (usedSlugs.has(slug)) {
        slug = `${base}-${n}`;
        n += 1;
      }

      try {
        await prisma.vendor.create({
          data: {
            code,
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
        usedSlugs.add(slug);
        if (code) existingCodes.add(code);
        created.push({ code, name: d.name });
      } catch (e: any) {
        if (e?.code === 'P2002') {
          skipped.push({ name: d.name, reason: `Duplicate ${e.meta?.target ?? 'value'}` });
        } else {
          errors.push({ name: d.name, reason: 'Failed to create' });
          console.error('Bulk vendor create error:', d.name, e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        createdCount: created.length,
        skippedCount: skipped.length,
        errorCount: errors.length,
        created,
        skipped,
        errors,
      },
    });
  } catch (error) {
    console.error('Error bulk-importing vendors:', error);
    return NextResponse.json({ error: 'Failed to import vendors' }, { status: 500 });
  }
}
