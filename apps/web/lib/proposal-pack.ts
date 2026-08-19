import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { priceQuotePayload } from '@/lib/quote-pricing';

// Shared by POST /api/admin/proposals (which persists and emails) and
// POST /api/admin/proposals/preview (which does neither). Both go through the
// same builder, so what the admin previews is priced exactly like what gets
// sent — no second implementation to drift.

/** One pack option. A proposal carries one or more of these. */
export const packSchema = z.object({
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

export type PackInput = z.infer<typeof packSchema>;

/** Pick the price tier that applies at this pack quantity (tier 1 as fallback). */
export function tierPrice(
  tiers: { minQty: number; maxQty: number | null; sellPrice: any }[],
  qty: number
): number {
  const match =
    tiers.find((t) => qty >= t.minQty && (t.maxQty == null || qty <= t.maxQty)) ?? tiers[0];
  return match ? Number(match.sellPrice) : 0;
}

/** Build + price one pack option, returning the quote payload to persist. */
export async function buildPackPayload(pack: PackInput) {
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
