'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBuilderStore } from '@/store/builder';
import { computePricing } from '@giftcraft/pricing';
import { computeOrderShipping } from '@/lib/shipping';
import { SELLER_STATE_CODE } from '@/lib/constants';
import { resolveBuyerStateCode } from '@/lib/pincode-to-state';

/**
 * Prices the pack, creates the quote, and sends the user to checkout.
 *
 * This used to live in the Step 4 review screen. That step only re-displayed
 * details already entered in Step 3, so it was removed — the delivery step now
 * calls this directly, and it stays a hook so the sticky footer's forward
 * button and any in-step button run the exact same flow.
 */
export function useProceedToCheckout() {
  const router = useRouter();
  const {
    deliveryMode,
    address,
    delivDate,
    products,
    packQuantity,
    packaging,
    addons,
    sleeve,
    shippingZone,
    coupon,
    logo,
    brandingNotes,
    cardMessage,
    pincode,
    csvRecipientCount,
    setReviewOrder,
    setReviewStatus,
  } = useBuilderStore();

  const [loading, setLoading] = useState(false);

  // Which required address fields are still missing (single-location delivery).
  const missingAddressFields: string[] = [];
  if (deliveryMode === 'single') {
    if (!address?.name?.trim()) missingAddressFields.push('Name');
    if (!address?.address1?.trim()) missingAddressFields.push('Address Line 1');
    if (!address?.city?.trim()) missingAddressFields.push('City');
    if (!address?.state) missingAddressFields.push('State');
    if (!/^\d{6}$/.test(address?.pincode || '')) missingAddressFields.push('a 6-digit Pincode');
    if (!address?.phone?.trim()) missingAddressFields.push('Phone');
  }

  const deliveryComplete =
    deliveryMode === 'individual'
      ? csvRecipientCount > 0
      : missingAddressFields.length === 0;

  // Shipping uses the quoted cost from the estimate API (Shiprocket real-time
  // courier rate, or zone fallback); recompute locally only as a safety net if
  // no pincode has been checked yet.
  const shippingFlat =
    shippingZone?.shippingCost ??
    computeOrderShipping({
      // One unit of each product per pack; packQuantity is the multiplier.
      products: products.map((p) => ({
        weightG: p.weightG,
        quantity: 1,
        sellPrice: p.sellPrice,
        dimensionL: p.dimensionL,
        dimensionW: p.dimensionW,
        dimensionH: p.dimensionH,
      })),
      zone: shippingZone,
      packQuantity,
      deliveryMode,
    }).shippingCost;

  // GST split (CGST+SGST vs IGST) is determined by the buyer's delivery state
  // (SOW §3.4.4). The selected state is authoritative — Delhi (= seller state)
  // → CGST+SGST, any other state → IGST — with the pincode as a fallback. Only
  // when neither resolves do we default to the seller state (intra-state).
  const buyerStateCode =
    resolveBuyerStateCode(address?.state, address?.pincode || pincode) ||
    SELLER_STATE_CODE;

  const pricing = useMemo(() => {
    const productsForPricing = products.map((p) => ({
      sellPrice: p.sellPrice,
      // One unit of each product per pack; packQuantity is the multiplier.
      // (Matches the server-side recompute in /api/orders.)
      quantity: 1,
      hsnCode: p.hsnCode ?? '4820',
      gstRate: p.gstRate ?? 18,
    }));

    return computePricing({
      products: productsForPricing,
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
    });
  }, [products, packQuantity, packaging, addons, sleeve, shippingFlat, coupon, buyerStateCode]);

  const proceedToCheckout = async () => {
    setLoading(true);
    try {
      const quoteRes = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products,
          packQuantity,
          packaging,
          addons,
          sleeve,
          shippingZone,
          pricing,
          deliveryMode,
          discount: coupon?.discountAmount || 0,
          logoUrl: logo?.url || null,
          brandingNotes,
          cardMessage,
          // Delivery details collected in Step 3
          address,
          delivDate,
          pincode,
          csvRecipientCount,
        }),
      });

      if (!quoteRes.ok) {
        throw new Error('Failed to create quote');
      }

      const quote = await quoteRes.json();
      router.push(`/checkout?quoteId=${quote.shareToken}`);
    } catch (error) {
      console.error('Error creating quote:', error);
      alert('Failed to proceed. Please try again.');
      setLoading(false);
    }
  };

  // Publish the action + live status so the sticky footer's forward button
  // (BuilderLayout) triggers this exact flow. The ref keeps the registered
  // wrapper stable (registered once) while always calling the latest handler,
  // so re-renders don't re-register or loop.
  const handlerRef = useRef(proceedToCheckout);
  handlerRef.current = proceedToCheckout;
  useEffect(() => {
    setReviewOrder(() => handlerRef.current());
    return () => setReviewOrder(null);
  }, [setReviewOrder]);
  useEffect(() => {
    setReviewStatus({ loading, ready: deliveryComplete });
  }, [loading, deliveryComplete, setReviewStatus]);

  return { proceedToCheckout, loading, deliveryComplete, missingAddressFields };
}
