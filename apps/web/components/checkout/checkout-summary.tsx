'use client';

import { formatRupees } from '@/lib/utils';

export function CheckoutSummary({ payload }: { payload: any }) {
  const products = payload.products || [];
  const pricing = payload.pricing || {};
  const packaging = payload.packaging;
  const addons = payload.addons || [];
  const shippingZone = payload.shippingZone;

  return (
    <div className="bg-white rounded-gc-l border-2 border-bdr p-5 space-y-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
        Price Breakdown
      </p>

      {/* Products */}
      <div className="space-y-2 pb-4 border-b border-bdr">
        {products.map((product: any) => (
          <div key={product.id} className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-ink line-clamp-2">{product.name}</p>
              <p className="text-[10px] text-ink-3">×{product.quantity}</p>
            </div>
            <p className="text-xs font-black text-ink tabnum flex-shrink-0">
              {formatRupees(product.sellPrice * product.quantity)}
            </p>
          </div>
        ))}
      </div>

      {/* Customizations */}
      {(packaging || addons.length > 0) && (
        <div className="space-y-1.5 pb-4 border-b border-bdr">
          {packaging && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-3">{packaging.name}</span>
              <span className="font-semibold text-ink">+{formatRupees(packaging.price * payload.packQuantity)}</span>
            </div>
          )}
          {addons.map((addon: any) => (
            <div key={addon.id} className="flex items-center justify-between text-xs">
              <span className="text-ink-3">{addon.name}</span>
              <span className="font-semibold text-ink">+{formatRupees(addon.price * payload.packQuantity)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Shipping */}
      {shippingZone && (
        <div className="pb-4 border-b border-bdr">
          <p className="text-xs text-ink-3 font-semibold mb-1">{shippingZone.zoneName}</p>
          <p className="text-sm font-black text-ink tabnum">
            {formatRupees(shippingZone.flatRate)}
          </p>
        </div>
      )}

      {/* Pricing Details */}
      <div className="space-y-2 pb-4 border-b border-bdr">
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-3">Subtotal</span>
          <span className="font-semibold text-ink tabnum">{formatRupees(pricing.subtotal)}</span>
        </div>

        {/* GST Breakdown */}
        {pricing.hsnBreakdown && pricing.hsnBreakdown.length > 0 ? (
          <div className="space-y-1">
            {pricing.hsnBreakdown.map((line: any, idx: number) => (
              <div key={idx}>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-ink-3">GST {line.gstRate}% (HSN {line.hsnCode})</span>
                  <span className="font-semibold text-ink tabnum">+{formatRupees(line.cgst + line.sgst + line.igst)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {pricing.cgst > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-3">CGST (9%)</span>
                <span className="font-semibold text-ink tabnum">+{formatRupees(pricing.cgst)}</span>
              </div>
            )}
            {pricing.sgst > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-3">SGST (9%)</span>
                <span className="font-semibold text-ink tabnum">+{formatRupees(pricing.sgst)}</span>
              </div>
            )}
            {pricing.igst > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-3">IGST (18%)</span>
                <span className="font-semibold text-ink tabnum">+{formatRupees(pricing.igst)}</span>
              </div>
            )}
          </>
        )}

        {pricing.razorpayFee > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-3">Payment Processing</span>
            <span className="font-semibold text-ink tabnum">+{formatRupees(pricing.razorpayFee)}</span>
          </div>
        )}
      </div>

      {/* Grand Total */}
      <div className="space-y-1">
        <p className="text-xs text-ink-3 font-semibold">Grand Total</p>
        <p className="text-3xl font-black text-ink tabnum">
          {formatRupees(pricing.grandTotal)}
        </p>
        <p className="text-[10px] text-ink-3">{formatRupees(pricing.grandTotal)} per gift pack</p>
      </div>

      {/* Info Note */}
      <div className="bg-em-50 border-2 border-em-200 rounded-gc p-3">
        <p className="text-xs text-em-700 leading-relaxed">
          <span className="font-semibold">Note:</span> We will create branded mockups of your order to show how your logo will look on each product. You can approve them directly or request changes. Mockups are created to perfection first.
        </p>
      </div>
    </div>
  );
}
