'use client';

import { formatRupees } from '@/lib/utils';

export function CheckoutSummary({ payload }: { payload: any }) {
  const products = payload.products || [];
  const pricing = payload.pricing || {};
  const packaging = payload.packaging;
  const addons = payload.addons || [];
  const shippingZone = payload.shippingZone;

  return (
    <div className="rounded-gc-l border-2 border-bdr bg-white p-6 space-y-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
        Order Summary
      </p>

      {/* Products */}
      <div className="space-y-3 pb-6 border-b border-bdr">
        <p className="text-xs font-semibold text-ink mb-3">Items</p>
        {products.map((product: any) => (
          <div key={product.id} className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink line-clamp-2">{product.name}</p>
              <p className="text-xs text-ink-3 mt-0.5">×{product.quantity} = {formatRupees(product.sellPrice)}/unit</p>
            </div>
            <p className="text-sm font-black tabnum text-ink flex-shrink-0">
              {formatRupees(product.sellPrice * product.quantity)}
            </p>
          </div>
        ))}
      </div>

      {/* Customizations */}
      {(packaging || addons.length > 0) && (
        <div className="space-y-2 pb-6 border-b border-bdr">
          {packaging && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-2">{packaging.name}</span>
              <span className="font-semibold text-ink">
                +{formatRupees(packaging.price * payload.packQuantity)}
              </span>
            </div>
          )}
          {addons.length > 0 && (
            <div className="space-y-2">
              {addons.map((addon: any) => (
                <div key={addon.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink-2">{addon.name}</span>
                  <span className="font-semibold text-ink">
                    +{formatRupees(addon.price * payload.packQuantity)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shipping */}
      {shippingZone && (
        <div className="pb-6 border-b border-bdr">
          <p className="text-xs text-ink-3 font-semibold mb-2">{shippingZone.zoneName} Shipping</p>
          <p className="text-lg font-black text-ink tabnum">
            {formatRupees(shippingZone.flatRate)}
          </p>
        </div>
      )}

      {/* Pricing Breakdown */}
      <div className="space-y-3 pb-6 border-b border-bdr">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-2">Subtotal</span>
          <span className="font-semibold text-ink tabnum">{formatRupees(pricing.subtotal)}</span>
        </div>

        {/* HSN Breakdown */}
        {pricing.hsnBreakdown && pricing.hsnBreakdown.length > 0 && (
          <div className="bg-recessed rounded-gc p-3 space-y-2">
            <p className="text-xs font-semibold text-ink-3 mb-2">GST Breakdown</p>
            {pricing.hsnBreakdown.map((line: any, idx: number) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-3">HSN {line.hsnCode} ({line.gstRate}%)</span>
                  <span className="text-ink font-semibold tabnum">{formatRupees(line.taxableAmount)}</span>
                </div>
                {line.cgst > 0 && (
                  <div className="flex items-center justify-between text-xs ml-2">
                    <span className="text-ink-3">CGST ({line.gstRate / 2}%)</span>
                    <span className="text-ink-3 font-mono text-right">{formatRupees(line.cgst)}</span>
                  </div>
                )}
                {line.sgst > 0 && (
                  <div className="flex items-center justify-between text-xs ml-2">
                    <span className="text-ink-3">SGST ({line.gstRate / 2}%)</span>
                    <span className="text-ink-3 font-mono text-right">{formatRupees(line.sgst)}</span>
                  </div>
                )}
                {line.igst > 0 && (
                  <div className="flex items-center justify-between text-xs ml-2">
                    <span className="text-ink-3">IGST ({line.gstRate}%)</span>
                    <span className="text-ink-3 font-mono text-right">{formatRupees(line.igst)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Fallback GST display */}
        {(!pricing.hsnBreakdown || pricing.hsnBreakdown.length === 0) && (
          <>
            {pricing.cgst > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-2">CGST (9%)</span>
                <span className="font-semibold text-ink tabnum">+{formatRupees(pricing.cgst)}</span>
              </div>
            )}
            {pricing.sgst > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-2">SGST (9%)</span>
                <span className="font-semibold text-ink tabnum">+{formatRupees(pricing.sgst)}</span>
              </div>
            )}
            {pricing.igst > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-2">IGST (18%)</span>
                <span className="font-semibold text-ink tabnum">+{formatRupees(pricing.igst)}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Payment Fee */}
      {pricing.razorpayFee > 0 && (
        <div className="pb-6 border-b border-bdr">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-ink-2">Payment Gateway Fee</span>
            <span className="font-semibold text-ink tabnum">+{formatRupees(pricing.razorpayFee)}</span>
          </div>
          <p className="text-xs text-ink-3">(2.36% + 18% GST on fee)</p>
        </div>
      )}

      {/* Grand Total */}
      <div className="bg-dark text-white rounded-gc p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
          Total Amount Due
        </p>
        <p className="text-3xl font-black tabnum">
          {formatRupees(pricing.grandTotal)}
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-em-50 border border-em-400 rounded-gc p-3">
        <p className="text-xs text-em-700">
          <span className="font-semibold">Note:</span> Your quote expires on{' '}
          <span className="font-semibold">{new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
        </p>
      </div>
    </div>
  );
}
