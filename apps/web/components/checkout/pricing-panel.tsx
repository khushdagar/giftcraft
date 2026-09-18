'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatRupees } from '@/lib/utils';
import { FillProgressButton } from '@/components/ui/fill-progress-button';
import type { PricingBreakdown } from '@giftcraft/types';

export interface PricingLineProduct {
  name: string;
  technique?: string;
  lineTotal: number;
}

export interface PricingLineAddon {
  name: string;
  total: number;
}

interface PricingPanelProps {
  products: PricingLineProduct[];
  packagingName?: string;
  addons: PricingLineAddon[];
  pricing: PricingBreakdown;
  /** Places the order. */
  onContinue: () => void;
  /** True while the order is being placed — fills the CTA. */
  submitting?: boolean;
}

// Human label for the HSN-grouped GST lines (per SOW: one line per HSN group,
// plus a separate shipping GST line, plus the payment-fee GST).
function gstLineLabel(hsnCode: string, gstRate: number): string {
  if (hsnCode === '996812') return 'GST @ 18% on shipping';
  if (hsnCode === '4819') return 'GST @ 18% on packaging & add-ons';
  if (hsnCode === 'FEE') return 'GST @ 18% on payment fee';
  return `GST @ ${gstRate}% on products`;
}

export function PricingPanel({
  products,
  packagingName,
  addons,
  pricing,
  onContinue,
  submitting,
}: PricingPanelProps) {
  const [gstOpen, setGstOpen] = useState(false);

  // GST detail lines, one per HSN group (products, packaging & add-ons, and
  // shipping under HSN 996812), PLUS a synthetic line for the GST charged on the
  // payment fee — so the collapsible detail still sums to the combined GST shown
  // in the header. Combined GST is a single collapsible row.
  const gstLines = [
    ...pricing.hsnBreakdown.filter((line) => line.cgst + line.sgst + line.igst > 0),
    ...(pricing.razorpayFeeGst > 0
      ? [{ hsnCode: 'FEE', gstRate: 18, taxableAmount: pricing.razorpayFeeBase, cgst: 0, sgst: 0, igst: pricing.razorpayFeeGst }]
      : []),
  ];
  // Single all-in GST: goods/shipping GST + the GST on the payment fee.
  const gstTotal = pricing.gstTotal;
  // Payment fee shown PRE-GST; its GST is part of the combined GST line.
  const paymentFeeBase = pricing.razorpayFeeBase;

  // Shipping's courier rate is GST-inclusive. `gstTotal` above already contains
  // the tax hidden inside it, so this line must show the TAXABLE value — showing
  // the inclusive amount would count that tax twice down the column.
  const shippingTaxable = pricing.shippingTaxable ?? pricing.shipping;

  return (
    <div className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto lg:pr-1">
      <div className="bg-white/72 backdrop-blur-xl border border-[#D2D2D7]/30 rounded-2xl shadow-lg p-5 md:p-7">
        <h3 className="text-base font-semibold mb-4">Price Breakdown</h3>

        <div className="space-y-2 text-xs">
          {/* Products */}
          {products.map((p, i) => (
            <div key={`${p.name}-${i}`} className="flex justify-between text-[#5C5852]">
              <span>
                {p.name}
                <br />
                <span className="text-[10px] italic">
                  {p.technique && p.technique !== 'None' ? `incl. ${p.technique}` : 'no branding'}
                </span>
              </span>
              <span className="font-medium tabular-nums">{formatRupees(p.lineTotal)}</span>
            </div>
          ))}

          {/* Packaging */}
          <div className="flex justify-between text-[#5C5852]">
            <span>{packagingName || 'Packaging'}</span>
            <span className="font-medium tabular-nums">{formatRupees(pricing.packaging)}</span>
          </div>

          {/* Add-ons (incl. sleeve, itemised) */}
          {addons.map((addon, i) => (
            <div key={`${addon.name}-${i}`} className="flex justify-between text-[#5C5852]">
              <span>{addon.name}</span>
              <span className="font-medium tabular-nums">{formatRupees(addon.total)}</span>
            </div>
          ))}

          {/* Subtotal */}
          <div className="flex justify-between border-t border-[#E5DFD4] pt-2 mt-2 text-xs font-semibold text-[#222222]">
            <span>Subtotal (before shipping, GST)</span>
            <span className="tabular-nums">{formatRupees(pricing.itemsSubtotal)}</span>
          </div>

          {/* Discount */}
          {pricing.discount > 0 && (
            <div className="flex justify-between text-[#800020]">
              <span className="text-xs">Discount</span>
              <span className="font-medium tabular-nums text-xs">
                −{formatRupees(pricing.discount)}
              </span>
            </div>
          )}

          {/* Shipping — taxable value; its GST is disclosed in the GST line below */}
          <div className="flex justify-between text-[#5C5852]">
            <span className="text-xs">
              Shipping
              <br />
              {/* <span className="text-[10px] italic">HSN 996812 · GST shown below</span> */}
            </span>
            <span className="font-medium tabular-nums text-xs">{formatRupees(shippingTaxable)}</span>
          </div>

          {/* Payment Processing Fee — shown PRE-GST (2%); its GST is folded into
              the single combined GST line below. */}
          <div className="flex justify-between text-[#5C5852]">
            <span className="text-xs">
              Payment Processing Fee
              <br />
              <span className="text-[10px] italic">Razorpay 2%</span>
            </span>
            <span className="font-medium tabular-nums text-xs">{formatRupees(paymentFeeBase)}</span>
          </div>

          {/* GST — single all-in line (products + packaging/add-ons + shipping +
              payment-fee GST), collapsible. Click to view the calculation. */}
          {gstTotal > 0 && (
            <div className="mt-1 overflow-hidden">
              <button
                type="button"
                onClick={() => setGstOpen((o) => !o)}
                className="w-full flex justify-between items-center text-xs text-[#222222]"
                aria-expanded={gstOpen}
              >
                <span className="flex items-center gap-1 text-[#5C5852]">

                  GST
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${gstOpen ? '' : '-rotate-90'}`}
                  />
                </span>
                <span className="tabular-nums">{formatRupees(gstTotal)}</span>
              </button>

              {gstOpen && (
                <div className=" pb-2.5 pt-2 space-y-1.5">
                  {gstLines.map((line, i) => {
                    const amount = line.cgst + line.sgst + line.igst;
                    return (
                      <div
                        key={`${line.hsnCode}-${i}`}
                        className="flex justify-between text-[#5C5852] text-[11px]"
                      >
                        <span>
                          {gstLineLabel(line.hsnCode, line.gstRate)}
                          <br />
                          <span className="text-[10px]">
                            {line.hsnCode === 'FEE' ? 'Razorpay fee' : `HSN ${line.hsnCode}`}
                          </span>
                        </span>
                        <span className="font-medium tabular-nums">{formatRupees(amount)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Grand Total */}
          <div className="flex justify-between border-t-2 border-[#D3CBBC] pt-3 mt-2 text-lg font-bold">
            <span>Grand Total</span>
            <span className="tabular-nums">{formatRupees(pricing.grandTotal)}</span>
          </div>

          {/* Per Unit */}
          <div className="flex justify-between text-[#800020] font-semibold text-xs italic">
            <span>{formatRupees(pricing.perPack)} per gift pack</span>
          </div>
        </div>

        <div className="bg-[#FBF4F5] border-l-3 border-[#800020] px-3 py-2.5 rounded-lg text-xs text-[#560015] mt-4">
          No payment required now. Confirm your order and we'll create mockups for your approval
          first.
        </div>

        {/* Desktop CTA. On mobile the button in the fixed bar below takes over. */}
        <FillProgressButton
          onClick={() => onContinue()}
          active={!!submitting}
          className={`hidden lg:flex w-full h-[38px] mt-4 rounded-full font-semibold items-center justify-center gap-2 transition-all disabled:cursor-default bg-[#800020] text-white hover:bg-[#6B001B] ${
            submitting ? '' : 'animate-pulse'
          }`}
          fillClassName="bg-white/25 text-white"
          label="✓ Confirm Order & Get Mockups"
          activeLabel="Placing your order…"
        />

        {/* Legal */}
        <p className="text-[11px] text-[#8F8A82] text-center mt-3 leading-relaxed">
          By confirming, you agree to our Terms of Service, Privacy Policy, and Refund Policy.
          GST-compliant invoice will be generated upon payment.
        </p>
      </div>

      {/* Mobile action bar, pinned to the bottom of the SCREEN. It has to live
          outside the panel card above: that card uses backdrop-blur, and a
          backdrop-filter makes an element a containing block for its fixed
          descendants — inside it, `fixed` would anchor to the card, not the
          viewport. */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#D3CBBC] bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <p className="mb-1.5 text-center text-[10px] text-[#8F8A82]">
          No payment now — confirm and get branded mockups first.
        </p>
        <div className="flex gap-2">
          <FillProgressButton
            onClick={() => onContinue()}
            active={!!submitting}
            disabled={!!submitting}
            className="h-11 flex-1 rounded-full text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-all disabled:cursor-default bg-[#800020] text-white"
            fillClassName="bg-white/25 text-white"
            label="✓ Get Mockups First"
            activeLabel="Placing your order…"
          />
        </div>
      </div>
    </div>
  );
}
