'use client';

import { formatRupees } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export function CheckoutSummary({ payload }: { payload: any }) {
  const products = payload.products || [];
  const pricing = payload.pricing || {};
  const packaging = payload.packaging;
  const addons = payload.addons || [];
  const shippingZone = payload.shippingZone;

  return (
    <div className="space-y-6">
      <p className="text-sm font-semibold uppercase tracking-wider text-ink-3">
        Order Summary
      </p>

      {/* Products */}
      <div className="rounded-gc-l border-2 border-bdr bg-white p-5 space-y-3">
        <p className="text-xs font-semibold text-ink mb-3">Items</p>
        {products.map((product: any) => (
          <div key={product.id} className="flex items-center justify-between pb-2 border-b border-bdr last:border-0 last:pb-0">
            <div>
              <p className="text-sm font-semibold text-ink">{product.name}</p>
              <p className="text-xs text-ink-3">×{product.quantity}</p>
            </div>
            <p className="text-sm font-black tabnum text-ink">
              {formatRupees(product.sellPrice * product.quantity)}
            </p>
          </div>
        ))}
      </div>

      {/* Customizations */}
      {(packaging || addons.length > 0) && (
        <div className="space-y-2">
          {packaging && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-2">{packaging.name}</span>
              <span className="font-semibold text-ink">
                +{formatRupees(packaging.price * payload.packQuantity)}
              </span>
            </div>
          )}
          {addons.length > 0 && (
            <div>
              <p className="text-sm text-ink-2 mb-1">Add-ons:</p>
              {addons.map((addon: any) => (
                <div key={addon.id} className="flex items-center justify-between text-xs ml-2">
                  <span className="text-ink-3">{addon.name}</span>
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
        <div className="rounded-gc bg-sky-50 border border-sky-200 p-3">
          <p className="text-xs text-sky-700 font-semibold mb-2">{shippingZone.zoneName} Shipping</p>
          <p className="text-lg font-black text-sky-900 tabnum">
            {formatRupees(shippingZone.flatRate)}
          </p>
        </div>
      )}

      {/* Pricing Summary */}
      <div className="rounded-gc-l bg-dark text-inv p-5 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Subtotal</span>
          <span className="font-semibold tabnum">{formatRupees(pricing.subtotal)}</span>
        </div>
        {pricing.cgst > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span>CGST (9%)</span>
            <span className="font-semibold tabnum">+{formatRupees(pricing.cgst)}</span>
          </div>
        )}
        {pricing.sgst > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span>SGST (9%)</span>
            <span className="font-semibold tabnum">+{formatRupees(pricing.sgst)}</span>
          </div>
        )}
        {pricing.igst > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span>IGST (18%)</span>
            <span className="font-semibold tabnum">+{formatRupees(pricing.igst)}</span>
          </div>
        )}
        {pricing.razorpayFee > 0 && (
          <div className="flex items-center justify-between text-sm border-t border-inv/20 pt-2">
            <span>Payment Processing</span>
            <span className="font-semibold tabnum">+{formatRupees(pricing.razorpayFee)}</span>
          </div>
        )}
        <div className="border-t border-inv/20 pt-3 flex items-center justify-between">
          <span className="font-semibold">Total</span>
          <span className="text-2xl font-black tabnum">{formatRupees(pricing.grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
