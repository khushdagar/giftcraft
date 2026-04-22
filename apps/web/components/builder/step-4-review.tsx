'use client';

import { useMemo } from 'react';
import { useBuilderStore } from '@/store/builder';
import { formatRupees } from '@/lib/utils';
import { computePricing } from '@giftcraft/pricing';
import { Button } from '@/components/ui/button';

interface ReviewItem {
  id: string;
  name: string;
  quantity: number;
  sellPrice: number;
  subtotal: number;
}

export function Step4Review() {
  const {
    products,
    packQuantity,
    packaging,
    addons,
    shippingZone,
    getProductsSubtotal,
  } = useBuilderStore();

  const reviewItems: ReviewItem[] = useMemo(() => {
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      quantity: p.quantity,
      sellPrice: p.sellPrice,
      subtotal: p.sellPrice * p.quantity,
    }));
  }, [products]);

  const productsSubtotal = getProductsSubtotal();
  const packagingTotal = packaging ? packaging.price * packQuantity : 0;
  const addonsTotal = addons.reduce((sum, a) => sum + a.price * packQuantity, 0);
  const shippingFlat = shippingZone?.flatRate || 0;

  // Use 18% blended GST for now (Sprint 3 will do per-HSN)
  const pricing = useMemo(() => {
    return computePricing({
      productsSubtotal,
      packagingPerUnit: packaging?.price || 0,
      addonsPerUnit: addons.reduce((sum, a) => sum + a.price, 0),
      quantity: packQuantity,
      shippingFlat,
      sellerStateCode: 'DL',
      buyerStateCode: shippingZone?.stateCode || 'DL',
      effectiveGstRate: 18,
      razorpayFeePct: 2,
      razorpayFeeGstPct: 18,
    });
  }, [
    productsSubtotal,
    packQuantity,
    packaging,
    addons,
    shippingFlat,
    shippingZone,
  ]);

  const handlePlaceOrder = () => {
    // TODO: Implement checkout flow (requires auth)
    console.log('Place order:', { products, packQuantity, packaging, addons, shippingZone });
    alert('Order placement coming soon! For now: Redirect to login → checkout');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="overline text-ink-3">STEP 04</p>
        <h2 className="text-3xl font-black mt-1">Review & Order</h2>
      </div>

      {/* Order Summary */}
      <div className="rounded-gc-l bg-elevated border-2 border-bdr p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-3">
          Order Summary
        </p>

        {/* Products List */}
        <div className="space-y-2 pb-3 border-b border-bdr">
          {reviewItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">{item.name}</p>
                <p className="text-xs text-ink-3 mt-0.5">×{item.quantity}</p>
              </div>
              <p className="text-sm font-black tabnum text-ink">
                {formatRupees(item.subtotal)}
              </p>
            </div>
          ))}
        </div>

        {/* Customizations */}
        {(packaging || addons.length > 0) && (
          <div className="space-y-2 pb-3 border-b border-bdr">
            {packaging && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-2">{packaging.name}</p>
                <p className="text-sm font-semibold tabnum text-ink">
                  +{formatRupees(packagingTotal)}
                </p>
              </div>
            )}
            {addons.length > 0 && (
              <div>
                <p className="text-sm text-ink-2 mb-1">Add-ons:</p>
                <div className="ml-2 space-y-1">
                  {addons.map((addon) => {
                    const addonSubtotal = addon.price * packQuantity;
                    return (
                      <div key={addon.id} className="flex items-center justify-between">
                        <p className="text-xs text-ink-3">{addon.name}</p>
                        <p className="text-xs font-semibold tabnum text-ink">
                          +{formatRupees(addonSubtotal)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shipping */}
        {shippingZone && (
          <div className="flex items-center justify-between pb-3 border-b border-bdr">
            <div>
              <p className="text-sm text-ink-2">{shippingZone.zoneName} Shipping</p>
              <p className="text-xs text-ink-3 mt-0.5">Delivery in {shippingZone.etaMinDays}–{shippingZone.etaMaxDays} days</p>
            </div>
            <p className="text-sm font-semibold tabnum text-ink">
              +{formatRupees(shippingFlat)}
            </p>
          </div>
        )}
      </div>

      {/* Pricing Breakdown */}
      <div className="rounded-gc-l bg-gold-50 border-2 border-gold p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gold-700 mb-2">
          Price Breakdown
        </p>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-ink-2">Subtotal</span>
            <span className="font-semibold tabnum text-ink">
              {formatRupees(pricing.subtotal)}
            </span>
          </div>

          {pricing.packaging > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-ink-2">Packaging</span>
              <span className="font-semibold tabnum text-ink">
                +{formatRupees(pricing.packaging)}
              </span>
            </div>
          )}

          {pricing.addons > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-ink-2">Add-ons</span>
              <span className="font-semibold tabnum text-ink">
                +{formatRupees(pricing.addons)}
              </span>
            </div>
          )}

          {pricing.shipping > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-ink-2">Shipping</span>
              <span className="font-semibold tabnum text-ink">
                +{formatRupees(pricing.shipping)}
              </span>
            </div>
          )}

          <div className="border-t border-gold-200 pt-2">
            {pricing.cgst > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-2">CGST (9%)</span>
                <span className="font-semibold tabnum text-ink">
                  +{formatRupees(pricing.cgst)}
                </span>
              </div>
            )}
            {pricing.sgst > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-2">SGST (9%)</span>
                <span className="font-semibold tabnum text-ink">
                  +{formatRupees(pricing.sgst)}
                </span>
              </div>
            )}
            {pricing.igst > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-2">IGST (18%)</span>
                <span className="font-semibold tabnum text-ink">
                  +{formatRupees(pricing.igst)}
                </span>
              </div>
            )}
          </div>

          {pricing.razorpayFee > 0 && (
            <div className="flex items-center justify-between text-xs border-t border-gold-200 pt-2">
              <span className="text-ink-2">Payment Processing Fee</span>
              <span className="font-semibold tabnum text-ink">
                +{formatRupees(pricing.razorpayFee)}
              </span>
            </div>
          )}
        </div>

        <div className="border-t border-gold-300 pt-3 flex items-center justify-between">
          <span className="font-semibold text-gold-700">Grand Total</span>
          <span className="text-2xl font-black tabnum text-gold-700">
            {formatRupees(pricing.grandTotal)}
          </span>
        </div>

        {packQuantity > 0 && (
          <p className="text-xs text-gold-600 text-right">
            ₹{formatRupees(pricing.perPack)} per pack
          </p>
        )}
      </div>

      {/* Place Order CTA */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 rounded-gc-l" disabled>
          Save as Draft
        </Button>
        <Button
          onClick={handlePlaceOrder}
          variant="em"
          className="flex-1 rounded-gc-l"
        >
          Place Order
        </Button>
      </div>

      {/* Info */}
      <div className="rounded-gc bg-blue-50 border border-blue-200 p-4">
        <p className="text-xs font-semibold text-blue-900 mb-1">ℹ️ Next Steps</p>
        <p className="text-xs text-blue-800 leading-relaxed">
          Click "Place Order" to proceed to checkout. You'll be able to review your order one more time and make payment via Razorpay.
        </p>
      </div>
    </div>
  );
}
