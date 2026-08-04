import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { priceQuotePayload } from '@/lib/quote-pricing';
import { sendProposalEmail, type EmailAttachment } from '@/lib/email';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const createSchema = z.object({
  recipientEmail: z.string().email(),
  recipientName: z.string().max(120).optional(),
  companyName: z.string().max(160).optional(),
  message: z.string().max(2000).optional(),
  productIds: z.array(z.string()).min(1).max(20),
  packQuantity: z.number().int().min(1).max(100000),
  discount: z.number().min(0).optional(),
  // Box (a Packaging-category product) — price is per pack, already resolved
  // for the chosen size by the form.
  packaging: z
    .object({
      id: z.string(),
      name: z.string().max(160),
      price: z.number().min(0),
      size: z.string().max(40).optional(),
    })
    .nullable()
    .optional(),
  // Add-ons — each price is per pack.
  addons: z
    .array(z.object({ id: z.string(), name: z.string().max(160), price: z.number().min(0) }))
    .max(20)
    .optional(),
  // Flat shipping for the whole order, quoted manually by the admin.
  shippingFee: z.number().min(0).max(1000000).optional(),
});

/** Pick the price tier that applies at this pack quantity (tier 1 as fallback). */
function tierPrice(
  tiers: { minQty: number; maxQty: number | null; sellPrice: any }[],
  qty: number
): number {
  const match =
    tiers.find((t) => qty >= t.minQty && (t.maxQty == null || qty <= t.maxQty)) ??
    tiers[0];
  return match ? Number(match.sellPrice) : 0;
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const proposals = await prisma.proposal.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      quote: { select: { shareToken: true, status: true, expiresAt: true, payload: true } },
    },
  });

  const data = proposals.map((p) => {
    const payload = p.quote.payload as any;
    return {
      id: p.id,
      recipientEmail: p.recipientEmail,
      recipientName: p.recipientName,
      companyName: p.companyName,
      createdAt: p.createdAt.toISOString(),
      shareToken: p.quote.shareToken,
      quoteStatus: p.quote.status,
      expiresAt: p.quote.expiresAt.toISOString(),
      grandTotal: Number(payload?.pricing?.grandTotal) || 0,
      productCount: Array.isArray(payload?.products) ? payload.products.length : 0,
      packQuantity: Number(payload?.packQuantity) || 0,
      // What was actually in the pack — lets the enquiries table show which
      // proposal a lead received without opening it.
      productNames: Array.isArray(payload?.products)
        ? payload.products.map((pr: any) => String(pr?.name ?? '')).filter(Boolean)
        : [],
      packagingName: payload?.packaging?.name ?? null,
      addonNames: Array.isArray(payload?.addons)
        ? payload.addons.map((a: any) => String(a?.name ?? '')).filter(Boolean)
        : [],
    };
  });

  return NextResponse.json({ success: true, data });
}

/**
 * Create a proposal: build a Quote payload from the selected products (priced
 * server-side, HSN/GST from the DB), then email the lead a link to the quote
 * page with the proposal deck PDF attached.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = createSchema.parse(await req.json());

    const products = await prisma.product.findMany({
      where: { id: { in: body.productIds } },
      include: {
        priceTiers: { orderBy: { tier: 'asc' } },
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
      },
    });
    if (products.length === 0) {
      return NextResponse.json({ error: 'No valid products selected' }, { status: 400 });
    }

    // Same shape the builder posts to /api/quotes: one unit per product,
    // packQuantity as the multiplier. Shipping is 0 — confirmed at order time.
    const payload: any = {
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        sellPrice: tierPrice(p.priceTiers, body.packQuantity),
        quantity: 1,
        image: p.images[0]?.url ?? null,
        weightG: p.weightG,
        dimensionL: p.dimensionL,
        dimensionW: p.dimensionW,
        dimensionH: p.dimensionH,
      })),
      packQuantity: body.packQuantity,
      packaging: body.packaging ?? null,
      addons: body.addons ?? [],
      sleeve: false,
      shippingZone: { shippingCost: body.shippingFee || 0 },
      deliveryMode: 'single',
      discount: body.discount || 0,
      logoUrl: null,
      brandingNotes: '',
      cardMessage: '',
      address: null,
      delivDate: null,
      pincode: null,
      csvRecipientCount: 0,
    };

    const { pricing } = await priceQuotePayload(payload);
    payload.pricing = pricing;

    const shareToken = nanoid(12);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const proposal = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.create({
        data: {
          shareToken,
          createdById: session.user.id,
          status: 'active',
          expiresAt,
          payload,
        },
      });
      return tx.proposal.create({
        data: {
          quoteId: quote.id,
          recipientEmail: body.recipientEmail,
          recipientName: body.recipientName || null,
          companyName: body.companyName || null,
          message: body.message || null,
          createdById: session.user.id,
        },
      });
    });

    // Attach the proposal deck PDF. Best-effort — the email (with the quote
    // link) still goes out if PDF generation fails.
    const attachments: EmailAttachment[] = [];
    try {
      const deckRes = await fetch(`${APP_URL}/api/quotes/${shareToken}/deck`, {
        cache: 'no-store',
      });
      if (deckRes.ok) {
        attachments.push({
          filename: `givoo-proposal-${shareToken}.pdf`,
          content: Buffer.from(await deckRes.arrayBuffer()),
        });
      } else {
        console.error('Proposal deck generation failed:', deckRes.status);
      }
    } catch (error) {
      console.error('Proposal deck fetch error:', error);
    }

    const emailResult = await sendProposalEmail({
      to: body.recipientEmail,
      recipientName: body.recipientName,
      companyName: body.companyName,
      quoteToken: shareToken,
      packQuantity: body.packQuantity,
      productNames: products.map((p) => p.name),
      grandTotal: Number(pricing.grandTotal),
      validUntil: expiresAt,
      message: body.message,
      attachments,
    });

    return NextResponse.json(
      {
        success: true,
        id: proposal.id,
        shareToken,
        emailSent: !!emailResult.success,
        deckAttached: attachments.length > 0,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || 'Invalid input' }, { status: 400 });
    }
    console.error('Proposal creation error:', error);
    return NextResponse.json({ error: 'Failed to create proposal' }, { status: 500 });
  }
}
