import { Gift, Package, Zap, Truck, Calculator, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = {
  title: 'Transparent Pricing | GiftCraft',
  description: 'See exactly how GiftCraft pricing works. No hidden fees.',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-canvas py-12 px-4">
      <div className="container-gc-w max-w-3xl">
        {/* Header */}
        <div className="mb-16 text-center">
          <p className="overline text-ink-3">PRICING</p>
          <h1 className="t-title mt-2 text-ink">Transparent. Fair. No Surprises.</h1>
          <p className="text-ink-2 mt-4 text-lg">
            Every component of your order is visible, calculated, and justified.
          </p>
        </div>

        {/* Pricing Layers */}
        <div className="space-y-4 mb-12">
          {/* Layer 1: Products */}
          <div className="rounded-md border-2 border-em/20 bg-em-50 p-6">
            <div className="flex gap-4 items-start">
              <Gift className="w-6 h-6 text-em flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-normal text-lg text-em mb-1">Base Product Price</h3>
                <p className="text-em-700">
                  Premium sourcing and standard branding (logos, prints) included in every product. No extra "branding cost" line.
                </p>
              </div>
            </div>
          </div>

          {/* Layer 2: Packaging */}
          <div className="rounded-md border-2 border-gold/20 bg-gold-50 p-6">
            <div className="flex gap-4 items-start">
              <Package className="w-6 h-6 text-gold-700 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-normal text-lg text-gold-900 mb-1">Packaging (Optional)</h3>
                <p className="text-gold-800">
                  Custom boxes, sleeves, or premium unboxing experiences. Charged per unit across all packs.
                </p>
              </div>
            </div>
          </div>

          {/* Layer 3: Add-ons */}
          <div className="rounded-md border-2 border-indigo-200 bg-[#EEF2FF] p-6">
            <div className="flex gap-4 items-start">
              <Zap className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-normal text-lg text-indigo-900 mb-1">Add-ons (Optional)</h3>
                <p className="text-indigo-800">
                  Personalized cards, gift wrapping, thank-you notes, or bespoke inserts. Per-unit pricing, scales across all packs.
                </p>
              </div>
            </div>
          </div>

          {/* Layer 4: Shipping */}
          <div className="rounded-md border-2 border-sky-200 bg-sky-50 p-6">
            <div className="flex gap-4 items-start">
              <Truck className="w-6 h-6 text-sky-700 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-normal text-lg text-sky-900 mb-1">Shipping</h3>
                <p className="text-sky-800">
                  Flat rate per shipping zone (Metro/Tier-1/Tier-2). Same cost whether you send to 1 location or 100.
                </p>
              </div>
            </div>
          </div>

          {/* Layer 5: GST */}
          <div className="rounded-md border-2 border-orange-200 bg-[#FFF7ED] p-6">
            <div className="flex gap-4 items-start">
              <Calculator className="w-6 h-6 text-orange-700 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-normal text-lg text-orange-900 mb-1">GST (18%)</h3>
                <p className="text-orange-800 mb-2">
                  Applied per product HSN code. Calculated based on shipping location:
                </p>
                <ul className="text-sm text-orange-800 space-y-1">
                  <li>
                    <strong>Same state (Delhi):</strong> CGST 9% + SGST 9% = 18%
                  </li>
                  <li>
                    <strong>Cross-state:</strong> IGST 18% (single rate)
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Layer 6: Razorpay Fee */}
          <div className="rounded-md border-2 border-bdr bg-elevated p-6">
            <div className="flex gap-4 items-start">
              <CreditCard className="w-6 h-6 text-ink flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-normal text-lg text-ink mb-1">Payment Processing Fee</h3>
                <p className="text-ink-2 mb-2">
                  2% of the total order amount, plus 18% GST on the fee itself = approximately 2.36% effective rate.
                </p>
                <p className="text-xs text-ink-3">
                  <strong>Why we pass it on:</strong> We absorb the infrastructure cost of secure payments. You pay the actual gateway fee — no markup.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Example Calculation */}
        <div className="rounded-md border-2 border-dark bg-dark text-inv p-8 mb-12">
          <h3 className="font-normal text-xl mb-6">Example: 50 Corporate Welcome Kits</h3>
          <div className="space-y-2 text-sm mb-6">
            <div className="flex justify-between">
              <span>50 Premium Flasks × ₹200</span>
              <span className="tabnum">₹10,000</span>
            </div>
            <div className="flex justify-between">
              <span>Premium Gift Box (50 units × ₹25)</span>
              <span className="tabnum">₹1,250</span>
            </div>
            <div className="flex justify-between">
              <span>Personalized Thank You Cards (50 × ₹10)</span>
              <span className="tabnum">₹500</span>
            </div>
            <div className="flex justify-between">
              <span>Metro Shipping (Delhi → Delhi)</span>
              <span className="tabnum">₹1,500</span>
            </div>
            <div className="border-t border-inv/20 pt-2 my-2" />
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="tabnum">₹13,250</span>
            </div>
            <div className="flex justify-between">
              <span>CGST (9%) + SGST (9%)</span>
              <span className="tabnum">+₹2,385</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Processing Fee (2% + GST)</span>
              <span className="tabnum">+₹397</span>
            </div>
            <div className="border-t border-inv/20 pt-2 my-2" />
            <div className="flex justify-between text-lg font-normal">
              <span>Grand Total</span>
              <span className="tabnum">₹16,032</span>
            </div>
            <div className="flex justify-between text-xs text-inv/70">
              <span>Per Kit</span>
              <span className="tabnum">₹320.64</span>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-6 mb-12">
          <h2 className="t-heading font-normal text-ink">Frequently Asked Questions</h2>

          <details className="rounded-md border-2 border-bdr bg-white p-5 group cursor-pointer">
            <summary className="font-normal text-ink flex items-center justify-between">
              Why does the Razorpay fee exist?
              <span className="text-ink-3 group-open:rotate-180 transition">▼</span>
            </summary>
            <p className="text-ink-2 mt-3 text-sm">
              Razorpay charges 2% + GST for payment processing. Rather than absorb it, we pass it directly to you — it's the actual cost. No markup, no hidden profit.
            </p>
          </details>

          <details className="rounded-md border-2 border-bdr bg-white p-5 group cursor-pointer">
            <summary className="font-normal text-ink flex items-center justify-between">
              Is branding (logo printing) included in the product price?
              <span className="text-ink-3 group-open:rotate-180 transition">▼</span>
            </summary>
            <p className="text-ink-2 mt-3 text-sm">
              Yes. Standard digital printing or embossing is included in every product's base price. If you need special techniques (screen print, custom embroidery), those are add-on upgrades, clearly listed during order placement.
            </p>
          </details>

          <details className="rounded-md border-2 border-bdr bg-white p-5 group cursor-pointer">
            <summary className="font-normal text-ink flex items-center justify-between">
              How is GST calculated?
              <span className="text-ink-3 group-open:rotate-180 transition">▼</span>
            </summary>
            <p className="text-ink-2 mt-3 text-sm">
              Each product has an HSN code with a standard GST rate (5-18%). We sum tax per product, then apply location routing: if you ship to Delhi, CGST+SGST. If to Mumbai, it's IGST instead. The invoice shows the breakdown per product.
            </p>
          </details>

          <details className="rounded-md border-2 border-bdr bg-white p-5 group cursor-pointer">
            <summary className="font-normal text-ink flex items-center justify-between">
              Can I negotiate on bulk orders?
              <span className="text-ink-3 group-open:rotate-180 transition">▼</span>
            </summary>
            <p className="text-ink-2 mt-3 text-sm">
              Our prices are fixed per tier — no negotiation needed. Larger quantities unlock better per-unit rates automatically. For enterprise orders (500+), contact our team for a custom quote.
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
