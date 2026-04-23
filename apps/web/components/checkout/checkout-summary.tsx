'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatRupees } from '@/lib/utils';
import { Download, Link2, MessageCircle } from 'lucide-react';

export function CheckoutSummary({ payload }: { payload: any }) {
  const [couponCode, setCouponCode] = useState('');
  const [showCouponError, setShowCouponError] = useState(false);

  const products = payload.products || [];
  const pricing = payload.pricing || {};
  const packaging = payload.packaging;
  const addons = payload.addons || [];
  const shippingZone = payload.shippingZone;

  const handleCouponApply = () => {
    if (!couponCode.trim()) {
      setShowCouponError(true);
      return;
    }
    setShowCouponError(false);
    // Handle coupon application
  };

  const handleDownloadPDF = () => {
    // Handle PDF download
  };

  const handleCopyLink = () => {
    // Handle copy link
  };

  const handleWhatsApp = () => {
    // Handle WhatsApp share
  };

  return (
    <div className="space-y-4">
      {/* Order Summary Box */}
      <div className="rounded-gc-l border-2 border-bdr bg-elevated p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
          Order Summary
        </p>

        <div className="space-y-2">
          {products.map((product: any) => (
            <div key={product.id} className="flex items-start justify-between gap-2 pb-2 border-b border-bdr last:border-0 last:pb-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink line-clamp-1">{product.name}</p>
                <p className="text-xs text-ink-3">×{product.quantity}</p>
              </div>
              <p className="text-sm font-black text-ink tabnum flex-shrink-0">
                {formatRupees(product.sellPrice * product.quantity)}
              </p>
            </div>
          ))}

          {(packaging || addons.length > 0) && (
            <>
              {packaging && (
                <div className="flex items-center justify-between text-sm pt-2 border-t border-bdr">
                  <span className="text-ink-2">{packaging.name}</span>
                  <span className="font-semibold text-ink">+{formatRupees(packaging.price * payload.packQuantity)}</span>
                </div>
              )}
              {addons.map((addon: any) => (
                <div key={addon.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink-2">{addon.name}</span>
                  <span className="font-semibold text-ink">+{formatRupees(addon.price * payload.packQuantity)}</span>
                </div>
              ))}
            </>
          )}

          {shippingZone && (
            <div className="flex items-center justify-between text-sm pt-2 border-t border-bdr">
              <span className="text-ink-2">{shippingZone.zoneName}</span>
              <span className="font-semibold text-ink">+{formatRupees(shippingZone.flatRate)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Pricing Breakdown Box */}
      <div className="rounded-gc-l border-2 border-bdr bg-white p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
          Pricing Breakdown
        </p>

        {/* Subtotal */}
        <div className="flex items-center justify-between pb-3 border-b border-bdr">
          <span className="text-sm text-ink-2">Subtotal</span>
          <span className="font-black text-ink tabnum">{formatRupees(pricing.subtotal)}</span>
        </div>

        {/* Shipping */}
        <div className="flex items-center justify-between pb-3 border-b border-bdr">
          <span className="text-sm text-ink-2">Shipping</span>
          <span className="font-black text-ink tabnum">+{formatRupees(shippingZone?.flatRate || 0)}</span>
        </div>

        {/* GST Breakdown */}
        <div className="space-y-2 pb-3 border-b border-bdr">
          <p className="text-xs font-semibold text-ink-2 mb-2">GST Breakdown</p>

          {pricing.hsnBreakdown && pricing.hsnBreakdown.length > 0 ? (
            <div className="space-y-1.5">
              {pricing.hsnBreakdown.map((line: any, idx: number) => (
                <div key={idx} className="space-y-0.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-3">HSN {line.hsnCode} @ {line.gstRate}%</span>
                    <span className="text-ink-3 font-mono">{formatRupees(line.taxableAmount)}</span>
                  </div>
                  {line.cgst > 0 && (
                    <div className="flex items-center justify-between ml-3">
                      <span className="text-ink-3">CGST ({line.gstRate / 2}%)</span>
                      <span className="text-ink-3 font-mono">+{formatRupees(line.cgst)}</span>
                    </div>
                  )}
                  {line.sgst > 0 && (
                    <div className="flex items-center justify-between ml-3">
                      <span className="text-ink-3">SGST ({line.gstRate / 2}%)</span>
                      <span className="text-ink-3 font-mono">+{formatRupees(line.sgst)}</span>
                    </div>
                  )}
                  {line.igst > 0 && (
                    <div className="flex items-center justify-between ml-3">
                      <span className="text-ink-3">IGST ({line.gstRate}%)</span>
                      <span className="text-ink-3 font-mono">+{formatRupees(line.igst)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1 text-xs">
              {pricing.cgst > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-ink-3">CGST (9%)</span>
                  <span className="text-ink-3 font-mono">+{formatRupees(pricing.cgst)}</span>
                </div>
              )}
              {pricing.sgst > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-ink-3">SGST (9%)</span>
                  <span className="text-ink-3 font-mono">+{formatRupees(pricing.sgst)}</span>
                </div>
              )}
              {pricing.igst > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-ink-3">IGST (18%)</span>
                  <span className="text-ink-3 font-mono">+{formatRupees(pricing.igst)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payment Gateway Fee */}
        {pricing.razorpayFee > 0 && (
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-ink-2">Payment Gateway Fee</p>
              <p className="text-xs text-ink-3 mt-1">(2.36% on payment amount + 18% GST)</p>
            </div>
            <span className="font-black text-ink tabnum">+{formatRupees(pricing.razorpayFee)}</span>
          </div>
        )}
      </div>

      {/* Grand Total */}
      <div className="rounded-full bg-dark text-white px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold opacity-80">Grand Total</p>
          <p className="text-xs text-white/70 mt-1">Per pack</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black tabnum">{formatRupees(pricing.grandTotal)}</p>
          <p className="text-xs text-white/70 mt-1">₹{Math.round(pricing.grandTotal / payload.packQuantity)}</p>
        </div>
      </div>

      {/* Coupon Code */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Enter coupon code"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          className="rounded-gc flex-1"
        />
        <Button
          onClick={handleCouponApply}
          variant="outline"
          className="rounded-gc px-6"
        >
          Apply
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-4 gap-2">
        <Button
          onClick={handleDownloadPDF}
          variant="outline"
          className="rounded-gc text-xs h-10 flex items-center justify-center gap-1"
        >
          <Download className="w-3 h-3" />
          <span className="hidden sm:inline">PDF</span>
        </Button>
        <Button
          onClick={handleCopyLink}
          variant="outline"
          className="rounded-gc text-xs h-10 flex items-center justify-center gap-1"
        >
          <Link2 className="w-3 h-3" />
          <span className="hidden sm:inline">Copy</span>
        </Button>
        <Button
          onClick={handleWhatsApp}
          variant="outline"
          className="rounded-gc text-xs h-10 flex items-center justify-center gap-1"
        >
          <MessageCircle className="w-3 h-3" />
          <span className="hidden sm:inline">WhatsApp</span>
        </Button>
        <Button
          variant="em"
          className="rounded-gc text-xs h-10 font-bold"
        >
          Place Order
        </Button>
      </div>

      {/* Next Step Info */}
      <div className="rounded-gc bg-em-50 border-2 border-em-200 p-4">
        <p className="text-xs text-em-700">
          <span className="font-semibold">Next Step:</span> Click "Place Order" to proceed to secure checkout. You'll review your order one more time and complete payment via Razorpay.
        </p>
      </div>
    </div>
  );
}
