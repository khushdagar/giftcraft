import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { priceQuotePayload } from '@/lib/quote-pricing';
import { sendProposalEmail, type EmailAttachment } from '@/lib/email';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/** One pack option. A proposal carries one or more of these. */
const packSchema = z.object({
  label: z.string().max(80).optional(),
  tagline: z.string().max(200).optional(),
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

const createSchema = z
  .object({
    recipientEmail: z.string().email(),
    recipientName: z.string().max(120).optional(),
    companyName: z.string().max(160).optional(),
    message: z.string().max(2000).optional(),
    packs: z.array(packSchema).min(1).max(6).optional(),
  })
  // Legacy single-pack body (the old dialog posted these at the top level).
  .and(packSchema.partial());

type PackInput = z.infer<typeof packSchema>;

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
      packs: {
        orderBy: { sortOrder: 'asc' },
        select: {
          label: true,
          quote: { select: { shareToken: true, status: true, payload: true } },
        },
      },
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
      proposalToken: p.shareToken,
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
      // Every option in the proposal. Single-pack proposals created before
      // multi-pack existed have no rows here — fall back to the primary quote.
      packs:
        p.packs.length > 0
          ? p.packs.map((pk) => {
              const pl = pk.quote.payload as any;
              return {
                label: pk.label,
                shareToken: pk.quote.shareToken,
                quoteStatus: pk.quote.status,
                grandTotal: Number(pl?.pricing?.grandTotal) || 0,
                packQuantity: Number(pl?.packQuantity) || 0,
                productCount: Array.isArray(pl?.products) ? pl.products.length : 0,
              };
            })
          : [
              {
                label: 'Pack 1',
                shareToken: p.quote.shareToken,
                quoteStatus: p.quote.status,
                grandTotal: Number(payload?.pricing?.grandTotal) || 0,
                packQuantity: Number(payload?.packQuantity) || 0,
                productCount: Array.isArray(payload?.products) ? payload.products.length : 0,
              },
            ],
    };
  });

  return NextResponse.json({ success: true, data });
}

/** Build + price one pack option, returning the quote payload to persist. */
async function buildPackPayload(pack: PackInput) {
  const products = await prisma.product.findMany({
    where: { id: { in: pack.productIds } },
    include: {
      priceTiers: { orderBy: { tier: 'asc' } },
      images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
    },
  });
  if (products.length === 0) return null;

  // Same shape the builder posts to /api/quotes: one unit per product,
  // packQuantity as the multiplier. Shipping is 0 — confirmed at order time.
  const payload: any = {
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      sellPrice: tierPrice(p.priceTiers, pack.packQuantity),
      quantity: 1,
      image: p.images[0]?.url ?? null,
      weightG: p.weightG,
      dimensionL: p.dimensionL,
      dimensionW: p.dimensionW,
      dimensionH: p.dimensionH,
    })),
    packQuantity: pack.packQuantity,
    packaging: pack.packaging ?? null,
    addons: pack.addons ?? [],
    sleeve: false,
    shippingZone: { shippingCost: pack.shippingFee || 0 },
    deliveryMode: 'single',
    discount: pack.discount || 0,
    logoUrl: null,
    brandingNotes: '',
    cardMessage: '',
    address: null,
    delivDate: null,
    pincode: null,
    csvRecipientCount: 0,
    // Shown on the quote page and deck so the client knows which option they
    // are looking at.
    packLabel: pack.label || null,
    packTagline: pack.tagline || null,
  };

  const { pricing, hsnByProductId } = await priceQuotePayload(payload);
  payload.pricing = pricing;

  // Snapshot the tax identity each line was priced with. Without it the deck
  // PDF has to guess (it used to assume 18%), and its GST table would contradict
  // the quoted total for any product on a 5% or 12% HSN.
  for (const p of payload.products) {
    const tax = hsnByProductId.get(p.id);
    if (tax) {
      p.hsnCode = tax.hsnCode;
      p.gstRate = tax.gstRate;
    }
  }

  return { payload, products, pricing };
}

/**
 * Create a proposal with one or more pack options. Each option becomes its own
 * Quote (priced server-side, HSN/GST from the DB) with its own share link, and
 * the lead gets one email pointing at a compare page listing them all.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = createSchema.parse(await req.json());

    // Accept both the multi-pack body and the legacy single-pack one.
    const packInputs: PackInput[] =
      body.packs && body.packs.length > 0
        ? body.packs
        : body.productIds && body.packQuantity
          ? [
              {
                label: body.label,
                tagline: body.tagline,
                productIds: body.productIds,
                packQuantity: body.packQuantity,
                discount: body.discount,
                packaging: body.packaging,
                addons: body.addons,
                shippingFee: body.shippingFee,
              },
            ]
          : [];

    if (packInputs.length === 0) {
      return NextResponse.json({ error: 'Add at least one pack' }, { status: 400 });
    }

    type BuiltPack = NonNullable<Awaited<ReturnType<typeof buildPackPayload>>> & {
      label: string;
      tagline: string | null;
      shareToken: string;
    };

    const built: BuiltPack[] = [];
    for (const [i, pack] of packInputs.entries()) {
      const result = await buildPackPayload(pack);
      if (!result) {
        return NextResponse.json(
          { error: `Pack ${i + 1} has no valid products selected` },
          { status: 400 }
        );
      }
      built.push({
        ...result,
        label: pack.label?.trim() || `Pack ${i + 1}`,
        tagline: pack.tagline?.trim() || null,
        shareToken: nanoid(12),
      });
    }

    const proposalToken = nanoid(12);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const primary = built[0];
    if (!primary) {
      return NextResponse.json({ error: 'Add at least one pack' }, { status: 400 });
    }

    const proposal = await prisma.$transaction(async (tx) => {
      const quotes: { id: string }[] = [];
      for (const b of built) {
        quotes.push(
          await tx.quote.create({
            data: {
              shareToken: b.shareToken,
              createdById: session.user.id,
              status: 'active',
              expiresAt,
              payload: b.payload,
            },
          })
        );
      }

      const created = await tx.proposal.create({
        data: {
          // The first option doubles as the proposal's primary quote.
          quoteId: quotes[0]!.id,
          shareToken: proposalToken,
          recipientEmail: body.recipientEmail,
          recipientName: body.recipientName || null,
          companyName: body.companyName || null,
          message: body.message || null,
          createdById: session.user.id,
        },
      });

      await tx.proposalPack.createMany({
        data: quotes.map((q, i) => ({
          proposalId: created.id,
          quoteId: q.id,
          label: built[i]!.label,
          tagline: built[i]!.tagline,
          sortOrder: i,
        })),
      });

      return created;
    });

    // ONE deck covering every option — comparison slide up front, then each
    // pack in full. Best-effort: the email (with the links) still goes out if
    // PDF generation fails.
    const attachments: EmailAttachment[] = [];
    try {
      const deckRes = await fetch(`${APP_URL}/api/proposals/${proposalToken}/deck`, {
        cache: 'no-store',
      });
      if (deckRes.ok) {
        attachments.push({
          filename: `givoo-proposal-${proposalToken}.pdf`,
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
      quoteToken: primary.shareToken,
      proposalToken,
      packQuantity: primary.payload.packQuantity,
      productNames: primary.products.map((p) => p.name),
      grandTotal: Number(primary.pricing.grandTotal),
      packs: built.map((b) => ({
        label: b.label,
        tagline: b.tagline,
        quoteToken: b.shareToken,
        packQuantity: b.payload.packQuantity,
        productNames: b.products.map((p) => p.name),
        grandTotal: Number(b.pricing.grandTotal),
      })),
      validUntil: expiresAt,
      message: body.message,
      attachments,
    });

    // Surface WHY a send failed — a silent "not delivered" is impossible to
    // debug from the admin side. `skipped` means the recipient has opted out of
    // the quotes category in their notification preferences.
    const emailError = (emailResult as { error?: unknown }).error;
    return NextResponse.json(
      {
        success: true,
        id: proposal.id,
        shareToken: primary.shareToken,
        proposalToken,
        packs: built.map((b) => ({ label: b.label, shareToken: b.shareToken })),
        packTokens: built.map((b) => b.shareToken),
        emailSent: !!emailResult.success,
        emailSkipped: !!(emailResult as { skipped?: boolean }).skipped,
        emailError: emailError
          ? (emailError as { message?: string })?.message || String(emailError)
          : null,
        deckAttached: attachments.length > 0,
        deckCount: attachments.length,
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
