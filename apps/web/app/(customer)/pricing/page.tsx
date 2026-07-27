import { Gift, Package, Zap, Truck, Calculator, CreditCard, ShieldCheck, TrendingDown, Paintbrush } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ASSEMBLY_QC_DAYS, DEFAULT_LEAD_TIME_DAYS, deliveryWindowDays } from '@/lib/shipping';

export const metadata = {
  title: 'Transparent Pricing | GIVOO',
  description: 'See exactly how GIVOO pricing works. No hidden fees.',
};

// Re-read pricing inputs (packaging, shipping, fee, GST) hourly so admin changes
// flow through without a redeploy.
export const revalidate = 3600;

const TECH_LABELS: Record<string, string> = {
  screen_print: 'screen printing',
  uv_print: 'UV printing',
  embroidery: 'embroidery',
  laser_engraving: 'laser engraving',
  digital_print: 'digital printing',
  emboss: 'embossing',
  none: 'standard branding',
};

function inr(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function tierQtyLabel(minQty: number, maxQty: number | null) {
  return maxQty ? `${minQty}–${maxQty}` : `${minQty}+`;
}

async function getSettingNumber(key: string, fallback: number) {
  const row = await prisma.platformSetting.findUnique({ where: { key } });
  const v = row?.value as unknown;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default async function PricingPage() {
  // ── Dynamic pricing inputs ──────────────────────────────
  const [
    packaging,
    zones,
    feePct,
    feeGst,
    gstAgg,
    sampleProduct,
    leadAgg,
  ] = await Promise.all([
    prisma.packaging.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
      select: { price: true },
    }),
    prisma.shippingZone.findMany({
      where: { isActive: true },
      orderBy: { etaMinDays: 'asc' },
      select: { name: true, flatRate: true, minCharge: true, etaMinDays: true, etaMaxDays: true },
    }),
    getSettingNumber('razorpay.fee_percentage', 2),
    getSettingNumber('razorpay.fee_gst', 18),
    prisma.hsnCode.aggregate({ _min: { defaultGstRate: true }, _max: { defaultGstRate: true } }),
    // A representative product (featured first) with full tiers + a real branding
    // technique — powers the "what's included" example and the tier chart.
    prisma.product.findFirst({
      where: {
        status: 'active',
        printingTechnique: { not: 'none' },
        priceTiers: { some: { tier: 1 } },
      },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
      include: { priceTiers: { orderBy: { tier: 'asc' } } },
    }),
    // Representative vendor lead time across the live catalogue, for the
    // end-to-end delivery estimate shown per zone.
    prisma.product.aggregate({
      where: { status: 'active' },
      _avg: { leadTimeDays: true },
    }),
  ]);

  const avgLeadDays = Math.round(leadAgg._avg.leadTimeDays ?? DEFAULT_LEAD_TIME_DAYS);

  const pkgMin = packaging.length ? Number(packaging[0]!.price) : 50;
  const pkgMax = packaging.length ? Number(packaging[packaging.length - 1]!.price) : 280;

  const gstMin = gstAgg._min.defaultGstRate ? Number(gstAgg._min.defaultGstRate) : 5;
  const gstMax = gstAgg._max.defaultGstRate ? Number(gstAgg._max.defaultGstRate) : 18;

  const effectiveFee = feePct * (1 + feeGst / 100); // e.g. 2 × 1.18 = 2.36%

  // Tier chart data from the sample product.
  const tiers = (sampleProduct?.priceTiers ?? []).map((t) => ({
    label: tierQtyLabel(t.minQty, t.maxQty),
    price: Number(t.sellPrice),
  }));
  const maxTierPrice = tiers.length ? Math.max(...tiers.map((t) => t.price)) : 0;
  const firstTier = tiers[0]?.price ?? 0;
  const lastTier = tiers.length ? tiers[tiers.length - 1]!.price : 0;
  const maxSavingsPct =
    firstTier > 0 ? Math.round(((firstTier - lastTier) / firstTier) * 100) : 0;

  const sampleName = sampleProduct?.name ?? 'Borosil Flask';
  const sampleTech = TECH_LABELS[sampleProduct?.printingTechnique ?? 'none'] ?? 'standard branding';
  const sampleUnitPrice = firstTier || 900;

  return (
    <div className="min-h-screen bg-canvas py-12 px-4">
      <div className="container-gc-w max-w-3xl">
        {/* Header / Philosophy */}
        <div className="mb-12 text-center">
          <p className="overline text-ink-3">PRICING</p>
          <h1 className="t-title mt-2 text-ink">Transparent. Fair. No Surprises.</h1>
          <p className="text-ink-2 mt-4 text-lg">
            We believe in transparent pricing. Every cost is visible and itemised — no hidden
            charges. The price you see on a product already includes standard logo branding.
          </p>
        </div>

        {/* What's Included in Product Price */}
        <div className="rounded-md border-2 border-em/20 bg-em-50 p-6 mb-4">
          <div className="flex gap-4 items-start">
            <Gift className="w-6 h-6 text-em flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-normal text-lg text-em mb-1">What's Included in the Product Price</h3>
              <p className="text-em-700">
                Each product's per-unit price includes the product itself <strong>and</strong> the
                standard printing/branding technique — no separate "branding cost" line, ever.
              </p>
              <p className="text-em-700 mt-2 text-sm italic">
                e.g. When you see {inr(sampleUnitPrice)}/unit for a {sampleName}, that already
                includes {sampleTech} of your logo.
              </p>
            </div>
          </div>
        </div>

        {/* Quantity Tiers infographic */}
        {tiers.length > 0 && (
          <div className="rounded-md border-2 border-bdr bg-white p-6 mb-12">
            <div className="flex gap-4 items-start mb-4">
              <TrendingDown className="w-6 h-6 text-em flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-normal text-lg text-ink mb-1">The More You Order, the Less You Pay</h3>
                <p className="text-ink-2 text-sm">
                  Per-unit pricing automatically drops as your quantity crosses each tier. Live
                  example — <strong>{sampleName}</strong>:
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {tiers.map((t, idx) => {
                const widthPct = maxTierPrice > 0 ? Math.max(8, (t.price / maxTierPrice) * 100) : 100;
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs font-medium text-ink-2 text-right">
                      {t.label} units
                    </span>
                    <div className="flex-1 h-7 rounded-md bg-em-50 overflow-hidden">
                      <div
                        className="h-full rounded-md bg-em flex items-center justify-end pr-2"
                        style={{ width: `${widthPct}%` }}
                      >
                        <span className="text-[11px] font-semibold text-white tabnum">{inr(t.price)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {maxSavingsPct > 0 && (
              <p className="text-xs text-em-700 mt-4 font-medium">
                Save up to {maxSavingsPct}% per unit at the highest volume tier.
              </p>
            )}
            <p className="text-[11px] text-ink-3 mt-1">
              Prices shown are exclusive of GST, packaging, and shipping (below).
            </p>
          </div>
        )}

        {/* What's Added On Top */}
        <p className="overline text-ink-3 mb-3">WHAT'S ADDED ON TOP</p>
        <div className="space-y-4 mb-12">
          {/* Packaging */}
          <div className="rounded-md border-2 border-gold/20 bg-gold-50 p-6">
            <div className="flex gap-4 items-start">
              <Package className="w-6 h-6 text-gold-700 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-normal text-lg text-gold-900 mb-1">Packaging (Optional)</h3>
                <p className="text-gold-800">
                  Custom boxes, sleeves, or premium unboxing experiences — typically{' '}
                  <strong>{inr(pkgMin)}–{inr(pkgMax)}/unit</strong> depending on box type. Charged
                  per unit across all packs.
                </p>
              </div>
            </div>
          </div>

          {/* Add-ons */}
          <div className="rounded-md border-2 border-indigo-200 bg-[#EEF2FF] p-6">
            <div className="flex gap-4 items-start">
              <Zap className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-normal text-lg text-indigo-900 mb-1">Add-ons (Optional)</h3>
                <p className="text-indigo-800">
                  Personalised cards, gift wrapping, thank-you notes, or bespoke inserts. Per-unit
                  pricing, scales across all packs.
                </p>
              </div>
            </div>
          </div>

          {/* Shipping */}
          <div className="rounded-md border-2 border-sky-200 bg-sky-50 p-6">
            <div className="flex gap-4 items-start">
              <Truck className="w-6 h-6 text-sky-700 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-normal text-lg text-sky-900 mb-1">Shipping & Delivery Time</h3>
                <p className="text-sky-800 mb-2">
                  Zone-based rates set per delivery region (same cost whether you send to 1 location
                  or 100 within a zone). The <strong>total delivery time</strong> below is end-to-end —
                  product lead time (~{avgLeadDays} days avg) + {ASSEMBLY_QC_DAYS} days assembly &amp; QC
                  + courier transit:
                </p>
                {zones.length > 0 && (
                  <ul className="text-sm text-sky-800 space-y-1">
                    {zones.map((z, i) => {
                      const rate = Number(z.minCharge) > 0 ? Number(z.minCharge) : Number(z.flatRate);
                      const win = deliveryWindowDays({
                        leadTimeDays: avgLeadDays,
                        etaMinDays: z.etaMinDays,
                        etaMaxDays: z.etaMaxDays,
                      });
                      return (
                        <li key={i} className="flex justify-between gap-3">
                          <span>{z.name}</span>
                          <span className="text-right">
                            <span className="font-medium">~{win.min}–{win.max} days</span>
                            <span className="text-sky-700"> · from </span>
                            <span className="tabnum">{inr(rate)}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="text-[11px] text-sky-700 mt-2">
                  Your exact delivery date is calculated at checkout from the actual products in your
                  pack (it uses each product's real vendor lead time) and your delivery pincode.
                </p>
              </div>
            </div>
          </div>

          {/* GST */}
          <div className="rounded-md border-2 border-orange-200 bg-[#FFF7ED] p-6">
            <div className="flex gap-4 items-start">
              <Calculator className="w-6 h-6 text-orange-700 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-normal text-lg text-orange-900 mb-1">GST ({gstMin}%–{gstMax}%)</h3>
                <p className="text-orange-800 mb-2">
                  Applied per product HSN code (rates range {gstMin}%–{gstMax}%) and shown
                  separately. Calculated based on shipping location:
                </p>
                <ul className="text-sm text-orange-800 space-y-1">
                  <li><strong>Same state (Delhi):</strong> CGST + SGST</li>
                  <li><strong>Cross-state:</strong> IGST (single combined rate)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Razorpay Fee */}
          <div className="rounded-md border-2 border-bdr bg-elevated p-6">
            <div className="flex gap-4 items-start">
              <CreditCard className="w-6 h-6 text-ink flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-normal text-lg text-ink mb-1">Payment Processing Fee</h3>
                <p className="text-ink-2 mb-2">
                  {feePct}% of the total order, plus {feeGst}% GST on the fee itself ≈{' '}
                  <strong>{effectiveFee.toFixed(2)}%</strong> effective rate, shown as a separate
                  line at checkout.
                </p>
                <p className="text-xs text-ink-3">
                  <strong>Why we pass it on:</strong> you pay the actual gateway fee — no markup, no
                  hidden profit.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Branding Requests */}
        <div className="rounded-md border-2 border-violet-200 bg-[#F5F3FF] p-6 mb-12">
          <div className="flex gap-4 items-start">
            <Paintbrush className="w-6 h-6 text-violet-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-normal text-lg text-violet-900 mb-1">Custom Branding Requests</h3>
              <p className="text-violet-800">
                Our standard pricing includes one printing technique per product. If you need a
                different technique (e.g. embroidery instead of screen printing, or foil stamping
                instead of laser engraving), mention it in the gift builder notes — our team will
                provide a separate quotation within 24 hours.
              </p>
            </div>
          </div>
        </div>

        {/* No Hidden Charges Guarantee */}
        <div className="rounded-md border-2 border-em bg-em text-white p-8 mb-12 text-center">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3" />
          <h3 className="font-normal text-2xl mb-2">No Hidden Charges Guarantee</h3>
          <p className="text-white/90">
            The total you see at checkout is the total you pay. We do not add any hidden charges
            after order confirmation.
          </p>
        </div>

        {/* FAQ */}
        <div className="space-y-6 mb-12">
          <h2 className="t-heading font-normal text-ink">Frequently Asked Questions</h2>

          <details className="rounded-md border-2 border-bdr bg-white p-5 group cursor-pointer">
            <summary className="font-normal text-ink flex items-center justify-between">
              Why does the payment processing fee exist?
              <span className="text-ink-3 group-open:rotate-180 transition">▼</span>
            </summary>
            <p className="text-ink-2 mt-3 text-sm">
              Razorpay charges {feePct}% + GST for payment processing. Rather than absorb it, we pass
              it directly to you — it's the actual cost. No markup, no hidden profit.
            </p>
          </details>

          <details className="rounded-md border-2 border-bdr bg-white p-5 group cursor-pointer">
            <summary className="font-normal text-ink flex items-center justify-between">
              Is branding (logo printing) included in the product price?
              <span className="text-ink-3 group-open:rotate-180 transition">▼</span>
            </summary>
            <p className="text-ink-2 mt-3 text-sm">
              Yes. One standard printing technique per product is included in the base price. If you
              need a different technique, add a note in the gift builder and our team will send a
              separate quotation within 24 hours.
            </p>
          </details>

          <details className="rounded-md border-2 border-bdr bg-white p-5 group cursor-pointer">
            <summary className="font-normal text-ink flex items-center justify-between">
              How is GST calculated?
              <span className="text-ink-3 group-open:rotate-180 transition">▼</span>
            </summary>
            <p className="text-ink-2 mt-3 text-sm">
              Each product has an HSN code with a standard GST rate ({gstMin}%–{gstMax}%). We sum tax
              per product, then apply location routing: ship to Delhi and it's CGST+SGST; ship
              elsewhere and it's IGST. The invoice shows the breakdown per product.
            </p>
          </details>

          <details className="rounded-md border-2 border-bdr bg-white p-5 group cursor-pointer">
            <summary className="font-normal text-ink flex items-center justify-between">
              Can I negotiate on bulk orders?
              <span className="text-ink-3 group-open:rotate-180 transition">▼</span>
            </summary>
            <p className="text-ink-2 mt-3 text-sm">
              Our prices are fixed per tier — no negotiation needed. Larger quantities unlock better
              per-unit rates automatically. For enterprise orders (500+), contact our team for a
              custom quote.
            </p>
          </details>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-ink-3 mb-4">Ready to build your gift pack?</p>
          <Button asChild variant="em" size="xl" className="rounded-md">
            <Link href="/builder">Start Building</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
