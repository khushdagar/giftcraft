'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { X, Plus, Minus } from 'lucide-react';
import { useBuilderStore } from '@/store/builder';
import { formatRupees } from '@/lib/utils';
import { packagingSizeForCount } from '@/lib/packaging-designs';
import { computePricing } from '@giftcraft/pricing';
import { computeOrderShipping } from '@/lib/shipping';
import { SELLER_STATE_CODE } from '@/lib/constants';
import { resolveBuyerStateCode } from '@/lib/pincode-to-state';

/**
 * "Your Gift Pack" summary panel — the running snapshot of the pack the user is
 * building (units, box size, selected products, running subtotal). Shown as the
 * sticky right-hand column on every builder step so the user always sees what
 * they're assembling. Reads everything from the builder store, so it needs no
 * props.
 */
export function GiftPackSummary() {
  const {
    products: selected,
    removeProduct,
    packQuantity,
    setPackQuantity,
    packaging,
    addons,
    sleeve,
    shippingZone,
    coupon,
    address,
    pincode,
  } = useBuilderStore();

  // Full running total — computed with the SAME pricing engine the final Review
  // step and checkout use (see step-4-review / lib/quote-pricing), so the number
  // shown here matches to the rupee. GST + payment fee are included so nothing
  // jumps unexpectedly later; before a delivery address is entered, GST is
  // estimated intra-state (Delhi) and re-computes once the address is set.
  const shippingFlat =
    shippingZone?.shippingCost ??
    computeOrderShipping({
      products: selected.map((p) => ({
        weightG: p.weightG,
        quantity: 1,
        sellPrice: p.sellPrice,
        dimensionL: p.dimensionL,
        dimensionW: p.dimensionW,
        dimensionH: p.dimensionH,
      })),
      zone: shippingZone,
      packQuantity,
      deliveryMode: 'single',
    }).shippingCost;

  const buyerStateCode =
    resolveBuyerStateCode(address?.state, address?.pincode || pincode) || SELLER_STATE_CODE;

  const pricing = useMemo(
    () =>
      computePricing({
        products: selected.map((p) => ({
          sellPrice: p.sellPrice,
          quantity: 1,
          hsnCode: p.hsnCode || '4820',
          gstRate: p.gstRate || 18,
        })),
        packagingPerUnit: Number(packaging?.price) || 0,
        addonsPerUnit: addons.reduce((sum, a) => sum + Number(a.price), 0) + (sleeve ? 60 : 0),
        packQuantity,
        shippingFlat,
        discount: coupon?.discountAmount || 0,
        sellerStateCode: SELLER_STATE_CODE,
        buyerStateCode,
        // 2% payment-processing fee + the 18% GST Razorpay charges on it (≈2.36%
        // effective), passed through to the customer per CLAUDE.md Rule 2.
        razorpayFeePct: 2,
        razorpayFeeGstPct: 18,
      }),
    [selected, packaging, addons, sleeve, packQuantity, shippingFlat, coupon, buyerStateCode]
  );

  // Line-item figures for the breakdown (all × packs, mirroring the engine).
  //
  // Every line here is quoted PRE-TAX, with all GST collected into a single line
  // of its own further down (classic invoice form). The two must stay in step:
  // fold GST into these lines AND keep the GST row and the same tax is counted
  // twice, both visually and in the sum.
  //
  // Build Your Box uses the same split — its "Products (before GST)" figure is
  // this page's per-pack products price, so the two pages reconcile on the
  // pre-tax number.
  const productsTotal = pricing.subtotal;
  const packagingTotal = pricing.packaging;
  const addonsTotal = pricing.addons;
  // Pre-tax shipping, NOT pricing.shipping. The courier rate is quoted
  // GST-inclusive, so showing it raw here while the GST line below also carries
  // shipping's tax counts that tax twice and leaves the rows short of the grand
  // total by exactly the shipping GST. The customer still pays the full rate:
  // this line + its share of the GST line == the quoted courier charge.
  const shippingTotal = pricing.shippingTaxable;
  const gstTotal = pricing.cgst + pricing.sgst + pricing.igst;
  const isInterState = pricing.igst > 0;
  const discountTotal = pricing.discount;

  // Price of one gift pack, pre-tax (one of each selected product).
  const perPackPrice = selected.reduce((sum, p) => sum + p.sellPrice, 0);

  // Box size is decided by the number of products in the pack (Small/Medium/Large).
  const boxSize = useMemo(() => packagingSizeForCount(selected.length), [selected.length]);

  return (
    <div className="min-w-0 lg:sticky lg:top-[140px] h-fit lg:max-h-[calc(100vh-230px)] lg:overflow-y-auto lg:pr-1 lg:pb-2">
      <div className="rounded-2xl bg-em-50 border-2 border-em-200 p-3 md:p-3 shadow-sm space-y-4">
        {/* Title with Count Badge */}
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-black tracking-tight text-ink">Your Gift Pack</h3>
          <div className="w-6 h-6 rounded-full bg-em text-white flex items-center justify-center text-xs font-bold">{selected.length}</div>
        </div>

        {/* Icon Grid Box */}
        {selected.length > 0 ? (
          <>
            {/* Units selected — applies to the whole pack */}
            <div className="rounded-md bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 mb-1.5">You have selected</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center border-2 border-emerald-200 rounded-md overflow-hidden">
                  <button
                    onClick={() => {
                      // packQuantity = number of packs. Each product stays at
                      // 1 unit per pack, so only the pack count changes here.
                      setPackQuantity(Math.max(1, packQuantity - 1));
                    }}
                    className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-emerald-50 hover:text-em transition"
                    title="Decrease units"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={packQuantity}
                    onChange={(e) => {
                      setPackQuantity(Math.max(1, parseInt(e.target.value) || 1));
                    }}
                    className="w-14 text-center text-base font-bold text-ink outline-none border-x-2 border-emerald-200 py-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => {
                      setPackQuantity(packQuantity + 1);
                    }}
                    className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-emerald-50 hover:text-em transition"
                    title="Increase units"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-sm text-ink-2">units</span>
              </div>
            </div>

            <div className="rounded-md border-2 border-gray-200 bg-white p-3">
              <div className="grid grid-cols-3 gap-2">
                {selected.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-center"
                  >
                    <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                      {product.images?.[0]?.url ? (
                        <Image
                          src={product.images[0].url}
                          alt={product.name}
                          width={56}
                          height={56}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <span className="text-2xl">📦</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Box Size Badge */}
            <div className="inline-block px-3 py-1 rounded-full bg-emerald-600 text-white">
              <p className="text-xs font-black">BOX SIZE: {boxSize}</p>
            </div>

            {/* Product List */}
            <div className="space-y-3">
              {selected.map((product) => (
                <div
                  key={product.id}
                  className="rounded-md bg-white p-3 flex items-center gap-2 shadow-sm hover:shadow-md transition"
                >
                  {/* Product Icon */}
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {product.images?.[0]?.url ? (
                      <Image
                        src={product.images[0].url}
                        alt={product.name}
                        width={40}
                        height={40}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <span className="text-lg">📦</span>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-ink line-clamp-1">
                      {product.name}
                    </p>
                    {/* Pre-tax, matching the "(₹605 + 5% GST)" base shown for the
                        same item on Build Your Box. GST for the whole pack is in
                        its own line in the total below. */}
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatRupees(product.sellPrice)} each
                    </p>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeProduct(product.id)}
                    className="text-gray-300 hover:text-red-600 transition flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Packaging — shown here (not on the page) once a design is picked */}
            {packaging && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Packaging</p>
                <div className="rounded-md bg-white p-3 flex items-center gap-2 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center">
                    <span className="text-lg">📦</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-ink line-clamp-1">{packaging.name}</p>
                    {packaging.size && (
                      <p className="text-xs text-gray-500 mt-0.5">Size · {packaging.size}</p>
                    )}
                  </div>
                  <p className="text-xs font-bold text-em flex-shrink-0">+{formatRupees(packaging.price)}</p>
                </div>
              </div>
            )}

            {/* Add-ons — each selected add-on listed like a product row */}
            {addons.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                  Add-ons ({addons.length})
                </p>
                <div className="space-y-2">
                  {addons.map((addon) => (
                    <div
                      key={addon.id}
                      className="rounded-md bg-white p-3 flex items-center gap-2 shadow-sm"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center">
                        <span className="text-lg">🎀</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-ink line-clamp-1">{addon.name}</p>
                      </div>
                      <p className="text-xs font-bold text-em flex-shrink-0">
                        {addon.price > 0 ? `+${formatRupees(addon.price)}` : 'Free'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Running total — grows the moment packaging, add-ons or shipping
                are chosen, so the number never jumps unexpectedly at checkout. */}
            <div className="rounded-xl bg-dark text-white p-4 space-y-3">
              {/* Line-item breakdown */}
              <div className="space-y-1.5">
                {/* (packs × per-box pre-tax) — matches the "Products (before
                    GST)" figure on Build Your Box. */}
                <div className="flex items-center justify-between text-xs text-white/70">
                  <span>
                    Products{' '}
                    <span className="text-white/40">
                      ({packQuantity} × {formatRupees(perPackPrice)})
                    </span>
                  </span>
                  <span className="tabnum">{formatRupees(productsTotal)}</span>
                </div>

                {packagingTotal > 0 && (
                  <div className="flex items-center justify-between text-xs text-white/70">
                    <span>
                      Packaging <span className="text-white/40">(× {packQuantity})</span>
                    </span>
                    <span className="tabnum">+{formatRupees(packagingTotal)}</span>
                  </div>
                )}

                {addonsTotal > 0 && (
                  <div className="flex items-center justify-between text-xs text-white/70">
                    <span>
                      Add-ons <span className="text-white/40">(× {packQuantity})</span>
                    </span>
                    <span className="tabnum">+{formatRupees(addonsTotal)}</span>
                  </div>
                )}

                {shippingTotal > 0 && (
                  <div className="flex items-center justify-between text-xs text-white/70">
                    <span>Shipping</span>
                    <span className="tabnum">+{formatRupees(shippingTotal)}</span>
                  </div>
                )}

                {discountTotal > 0 && (
                  <div className="flex items-center justify-between text-xs text-emerald-300">
                    <span>Discount</span>
                    <span className="tabnum">−{formatRupees(discountTotal)}</span>
                  </div>
                )}

                {/* All GST, in one line — products (per their own HSN rates),
                    packaging/add-ons and shipping combined. */}
                {gstTotal > 0 && (
                  <div className="flex items-center justify-between text-xs text-white/70">
                    <span>GST {isInterState ? '(IGST)' : '(CGST + SGST)'}</span>
                    <span className="tabnum">+{formatRupees(gstTotal)}</span>
                  </div>
                )}

                {pricing.razorpayFee > 0 && (
                  <div className="flex items-center justify-between text-xs text-white/70">
                    <span>Payment fee (2% + GST)</span>
                    <span className="tabnum">+{formatRupees(pricing.razorpayFee)}</span>
                  </div>
                )}
              </div>

              <div className="h-px bg-white/10" />

              {/* Grand total — matches the final Review step & checkout exactly */}
              <div>
                <p className="text-3xl font-black tabnum">{formatRupees(pricing.grandTotal)}</p>
                <p className="text-[11px] text-white/50 mt-1">
                  {shippingTotal > 0
                    ? 'Total incl. GST & payment fee'
                    : 'Incl. GST & fee · shipping added at Delivery'}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-xs text-emerald-600">Add products to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
