'use client';

import { formatRupees } from '@/lib/utils';
import { RazorpayButton } from './razorpay-button';

interface CheckoutSummaryProps {
  payload: any;
  selectedPath?: 'mockup' | 'pricelock';
  quoteId?: string;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
}

export function CheckoutSummary({
  payload,
  selectedPath = 'mockup',
  quoteId = '',
  userEmail = '',
  userName = '',
  userPhone = '',
}: CheckoutSummaryProps) {
  const products = payload.products || [];
  const pricing = payload.pricing || {};
  const packaging = payload.packaging;
  const addons = payload.addons || [];
  const shippingZone = payload.shippingZone;

  const grandTotal = pricing.grandTotal || 0;
  const advanceAmount = Math.round(grandTotal * 0.1 * 100) / 100;
  const balanceAmount = grandTotal - advanceAmount;

  return (
    <div className="space-y-4">
      {/* Unified Price Breakdown Box */}
      <div className="rounded-gc-l border-2 border-bdr bg-white p-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-4">
          Price Breakdown
        </p>

        {/* Product Details */}
        <div className="space-y-3 pb-4 border-b border-bdr">
          {products.map((product: any) => (
            <div key={product.id} className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink">{product.name}</p>
                <p className="text-xs text-ink-3 mt-0.5">incl. {product.printingTechnique || 'Screen Printed'}</p>
              </div>
              <p className="text-sm font-black text-ink tabnum flex-shrink-0">
                {formatRupees(product.sellPrice * product.quantity)}
              </p>
            </div>
          ))}
        </div>

        {/* Packaging & Addons */}
        {(packaging || addons.length > 0) && (
          <div className="space-y-2 pb-4 border-b border-bdr">
            {packaging && (
              <div className="flex items-center justify-between text-sm">
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
          </div>
        )}

        {/* Subtotal */}
        <div className="flex items-center justify-between pb-4 border-b border-bdr">
          <span className="text-sm text-ink-2">Subtotal (before shipping, GST)</span>
          <span className="font-black text-ink tabnum">{formatRupees(pricing.itemsSubtotal)}</span>
        </div>

        {/* Shipping — weight-based (SOW: ₹/kg per zone) */}
        <div className="flex items-center justify-between pb-4 border-b border-bdr">
          <span className="text-sm text-ink-2">
            Shipping{shippingZone?.zoneName ? ` (${shippingZone.zoneName})` : ''}
          </span>
          <span className="font-black text-ink tabnum">
            {pricing.shipping > 0 ? `+${formatRupees(pricing.shipping)}` : 'FREE'}
          </span>
        </div>

        {/* GST Breakdown per HSN */}
        <div className="space-y-2 pb-4 border-b border-bdr">
          {pricing.hsnBreakdown && pricing.hsnBreakdown.length > 0 ? (
            pricing.hsnBreakdown.map((line: any, idx: number) => {
              const totalTax = (line.cgst || 0) + (line.sgst || 0) + (line.igst || 0);
              return (
                <div key={idx} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-2">GST @ {line.gstRate}%</span>
                    <span className="text-ink-2 tabnum">{formatRupees(totalTax)}</span>
                  </div>
                  {line.hsnCode && (
                    <p className="text-xs text-ink-3">HSN {line.hsnCode}</p>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-2">GST @ 18%</span>
              <span className="text-ink-2 tabnum">{formatRupees((pricing.cgst || 0) + (pricing.sgst || 0) + (pricing.igst || 0))}</span>
            </div>
          )}
        </div>

        {/* Payment Gateway Fee */}
        {pricing.razorpayFee > 0 && (
          <div className="flex items-center justify-between pb-4 border-b border-bdr">
            <div>
              <p className="text-sm text-ink-2">Payment Processing</p>
              <p className="text-xs text-ink-3 italic">Razorpay 2%</p>
            </div>
            <span className="font-black text-ink tabnum">+{formatRupees(pricing.razorpayFee)}</span>
          </div>
        )}

        {/* Grand Total */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-lg font-black text-ink">Grand Total</span>
            <span className="text-2xl font-black text-ink tabnum">{formatRupees(pricing.grandTotal)}</span>
          </div>
          <p className="text-xs text-emerald-700 font-semibold">
            ₹{Math.round(pricing.grandTotal / payload.packQuantity)} per gift pack
          </p>
        </div>
      </div>

      {/* Path-specific content */}
      {selectedPath === 'mockup' && (
        <>
          {/* Mockup Path - Info Box */}
          <div className="rounded-gc bg-em-50 border-2 border-em-200 p-4">
            <p className="text-xs text-em-700">
              <span className="font-semibold">✓ No payment required now.</span> Confirm your order and we'll create mockups for your approval first.
            </p>
          </div>
        </>
      )}

      {selectedPath === 'pricelock' && (
        <>
          {/* Price Lock Path - Advance Info */}
          <div className="space-y-3 pt-4 border-t border-bdr">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-ink">10% Advance Payment</span>
              <span className="text-lg font-black text-gold-700 tabnum">{formatRupees(advanceAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-2 italic">Balance due after mockup approval</span>
              <span className="font-bold text-ink tabnum">{formatRupees(balanceAmount)}</span>
            </div>
            <div className="rounded-gc bg-gold-50 border-2 border-gold-300 p-3 mt-2">
              <p className="text-xs text-gold-800 font-semibold">⏰ Prices locked for 30 days from advance payment date.</p>
            </div>
          </div>

          {/* Payment Button for Price Lock */}
          <RazorpayButton
            quoteId={quoteId}
            amount={advanceAmount}
            email={userEmail}
            phone={userPhone}
            companyName={userName}
            buttonText={`🔒 Pay ${formatRupees(advanceAmount)} & Lock Prices`}
          />

          {/* Legal Text */}
          <p className="text-xs text-ink-3 text-center">
            By confirming, you agree to our <a href="#" className="text-em hover:underline">Terms of Service</a>, <a href="#" className="text-em hover:underline">Privacy Policy</a>, and <a href="#" className="text-em hover:underline">Refund Policy</a>. GST-compliant invoice will be generated upon payment.
          </p>
        </>
      )}
    </div>
  );
}
