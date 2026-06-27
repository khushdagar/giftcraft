'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatRupees } from '@/lib/utils';
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
  advance10: number;
  balance90: number;
  selectedPath: 'mockup' | 'lock';
  onContinue: () => void;
}

// Human label for the HSN-grouped GST lines (per SOW: one line per HSN group,
// plus a separate shipping GST line).
function gstLineLabel(hsnCode: string, gstRate: number): string {
  if (hsnCode === '9965') return 'GST @ 18% on shipping';
  if (hsnCode === '4819') return 'GST @ 18% on packaging & add-ons';
  return `GST @ ${gstRate}% on products`;
}

export function PricingPanel({
  products,
  packagingName,
  addons,
  pricing,
  advance10,
  balance90,
  selectedPath,
  onContinue,
}: PricingPanelProps) {
  const [gstOpen, setGstOpen] = useState(false);

  // GST detail lines (shipping is GST-inclusive from Shiprocket, so it has no
  // separate GST line). Combined GST is shown as a single collapsible row.
  const gstLines = pricing.hsnBreakdown.filter(
    (line) => line.hsnCode !== '9965' && line.cgst + line.sgst + line.igst > 0
  );
  const gstTotal = pricing.cgst + pricing.sgst + pricing.igst;

  return (
    <div className="sticky top-20 space-y-4">
      <div className="bg-white/72 backdrop-blur-xl border border-[#D2D2D7]/30 rounded-2xl shadow-lg p-5 md:p-7">
        <h3 className="text-base font-semibold mb-4">Price Breakdown</h3>

        <div className="space-y-2 text-xs">
          {/* Products */}
          {products.map((p, i) => (
            <div key={`${p.name}-${i}`} className="flex justify-between text-[#6B6B63]">
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
          <div className="flex justify-between text-[#6B6B63]">
            <span>{packagingName || 'Packaging'}</span>
            <span className="font-medium tabular-nums">{formatRupees(pricing.packaging)}</span>
          </div>

          {/* Add-ons (incl. sleeve, itemised) */}
          {addons.map((addon, i) => (
            <div key={`${addon.name}-${i}`} className="flex justify-between text-[#6B6B63]">
              <span>{addon.name}</span>
              <span className="font-medium tabular-nums">{formatRupees(addon.total)}</span>
            </div>
          ))}

          {/* Subtotal */}
          <div className="flex justify-between border-t border-[#E8E8E3] pt-2 mt-2 text-xs font-semibold text-[#1A1A18]">
            <span>Subtotal (before shipping, GST)</span>
            <span className="tabular-nums">{formatRupees(pricing.itemsSubtotal)}</span>
          </div>

          {/* Discount */}
          {pricing.discount > 0 && (
            <div className="flex justify-between text-[#1A6B4F]">
              <span className="text-xs">Discount</span>
              <span className="font-medium tabular-nums text-xs">
                −{formatRupees(pricing.discount)}
              </span>
            </div>
          )}

          {/* Shipping — Shiprocket rate is already GST-inclusive */}
          <div className="flex justify-between text-[#6B6B63]">
            <span className="text-xs">Shipping (incl. GST)</span>
            <span className="font-medium tabular-nums text-xs">{formatRupees(pricing.shipping)}</span>
          </div>

          {/* GST — single line, collapsible. Click to view the calculation. */}
          {gstTotal > 0 && (
            <div className="rounded-lg bg-[#F5F5F0] mt-1 overflow-hidden">
              <button
                type="button"
                onClick={() => setGstOpen((o) => !o)}
                className="w-full flex justify-between items-center px-3 py-2 text-xs text-[#1A1A18]"
                aria-expanded={gstOpen}
              >
                <span className="flex items-center gap-1 font-medium">
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${gstOpen ? '' : '-rotate-90'}`}
                  />
                  GST
                </span>
                <span className="font-semibold tabular-nums">{formatRupees(gstTotal)}</span>
              </button>

              {gstOpen && (
                <div className="px-3 pb-2.5 pt-2 space-y-1.5 border-t border-[#E4E4DF]">
                  {gstLines.map((line, i) => {
                    const amount = line.cgst + line.sgst + line.igst;
                    return (
                      <div
                        key={`${line.hsnCode}-${i}`}
                        className="flex justify-between text-[#6B6B63] text-[11px]"
                      >
                        <span>
                          {gstLineLabel(line.hsnCode, line.gstRate)}
                          <br />
                          <span className="text-[10px]">HSN {line.hsnCode}</span>
                        </span>
                        <span className="font-medium tabular-nums">{formatRupees(amount)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Payment Processing Fee */}
          <div className="flex justify-between text-[#6B6B63]">
            <span className="text-xs">
              Payment Processing Fee
              <br />
              <span className="text-[10px] italic">Razorpay 2%</span>
            </span>
            <span className="font-medium tabular-nums text-xs">{formatRupees(pricing.razorpayFee)}</span>
          </div>

          {/* Grand Total */}
          <div className="flex justify-between border-t-2 border-[#D4D4CF] pt-3 mt-2 text-lg font-bold">
            <span>Grand Total</span>
            <span className="tabular-nums">{formatRupees(pricing.grandTotal)}</span>
          </div>

          {/* Per Unit */}
          <div className="flex justify-between text-[#1A6B4F] font-semibold text-xs italic">
            <span>{formatRupees(pricing.perPack)} per gift pack</span>
          </div>
        </div>

        {/* Path-specific info */}
        {selectedPath === 'mockup' && (
          <div className="bg-[#E8F5EF] border-l-3 border-[#1A6B4F] px-3 py-2.5 rounded-lg text-xs text-[#0F4934] mt-4">
            No payment required now. Confirm your order and we'll create mockups for your approval
            first.
          </div>
        )}

        {selectedPath === 'lock' && (
          <div className="space-y-2 mt-4 text-xs">
            <div className="flex justify-between bg-[#FBF5E9] px-3 py-2.5 rounded-lg font-semibold text-[#886528]">
              <span>10% Advance Payment</span>
              <span className="tabular-nums">{formatRupees(advance10)}</span>
            </div>
            <div className="flex justify-between px-3 py-2 text-[#6B6B63] italic">
              <span>Balance due after mockup approval</span>
              <span className="font-semibold tabular-nums">{formatRupees(balance90)}</span>
            </div>
            <div className="bg-[#FBF5E9] border-l-3 border-[#C4963C] px-3 py-2.5 rounded-lg text-[#886528]">
              Prices locked for 30 days from advance payment date.
            </div>
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={onContinue}
          className={`w-full h-13 mt-4 rounded-full font-semibold flex items-center justify-center gap-2 transition-all ${
            selectedPath === 'mockup'
              ? 'bg-[#1A6B4F] text-white hover:bg-[#145A42] animate-pulse'
              : 'bg-[#C4963C] text-white hover:bg-[#886528]'
          }`}
        >
          {selectedPath === 'mockup'
            ? '✓ Confirm Order & Get Mockups'
            : `🔒 Pay ${formatRupees(advance10)} & Lock Prices`}
        </button>

        {/* Legal */}
        <p className="text-[11px] text-[#9B9B93] text-center mt-3 leading-relaxed">
          By confirming, you agree to our Terms of Service, Privacy Policy, and Refund Policy.
          GST-compliant invoice will be generated upon payment.
        </p>
      </div>
    </div>
  );
}
