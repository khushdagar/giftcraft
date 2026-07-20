'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useBuilderStore } from '@/store/builder';
import { computePricing } from '@giftcraft/pricing';
import { computeOrderShipping } from '@/lib/shipping';
import { SELLER_STATE_CODE } from '@/lib/constants';
import { resolveBuyerStateCode } from '@/lib/pincode-to-state';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, MapPin, CalendarDays, Users } from 'lucide-react';

export function Step4Review() {
  const router = useRouter();
  const {
    deliveryMode,
    address,
    delivDate,
    setCurrentStep,
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
  } = useBuilderStore();

  const [loading, setLoading] = useState(false);

  // Delivery details are entered (and auto-saved) in Step 3. Step 4 only reviews
  // them, so confirm they're complete before allowing the order to proceed.
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

  // An address is partially entered (so show what's missing rather than "none").
  const hasPartialAddress =
    deliveryMode === 'single' &&
    !!(address?.name?.trim() || address?.address1?.trim() || address?.pincode?.trim());

  // Calculate pricing for quote creation. Shipping uses the quoted cost from the
  // estimate API (Shiprocket real-time courier rate, or zone fallback); recompute
  // locally only as a safety net if no pincode has been checked yet.
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
  }, [products, packQuantity, packaging, addons, sleeve, shippingFlat, coupon, shippingZone, buyerStateCode]);

  const handleProceedToCheckout = async () => {
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

  const formattedDate = delivDate
    ? new Date(delivDate).toLocaleDateString('en-IN', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="overline text-ink-3">STEP 04</p>
        <h2 className="text-3xl font-black mt-1">Review &amp; Order</h2>
        <p className="text-sm text-ink-3 mt-1">
          Confirm your delivery details below. To edit them, go back to the Delivery step.
        </p>
      </div>

      {/* Delivery Mode Display — hidden while Individual Delivery is disabled, since
          every order is single-location. Restore alongside the mode picker in Step 3.

      <div className="rounded-md bg-em-50 border-2 border-em-200 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-3">
          Delivery Mode
        </p>
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-em text-white flex items-center justify-center flex-shrink-0 mt-1">
            ✓
          </div>
          <div>
            <p className="text-sm font-black text-ink">
              {deliveryMode === 'single' ? 'Single Location Shipping' : 'Individual Delivery'}
            </p>
            <p className="text-xs text-ink-3 mt-1">
              {deliveryMode === 'single'
                ? 'All packs delivered to one address'
                : 'Each pack to a different recipient'}
            </p>
          </div>
        </div>
      </div>
      */}

      {/* Delivery Address — read-only summary (single location) */}
      {deliveryMode === 'single' && (
        <div className="bg-white rounded-md border-2 border-bdr p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
              Delivery Address
            </p>
            <button
              onClick={() => setCurrentStep(3)}
              className="text-xs font-semibold text-em hover:underline"
            >
              Edit
            </button>
          </div>

          {deliveryComplete ? (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-ink-3 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-ink leading-relaxed">
                <p className="font-semibold">{address?.name}</p>
                {address?.company && <p className="text-ink-2">{address.company}</p>}
                <p className="text-ink-2">{address?.address1}</p>
                {address?.address2 && <p className="text-ink-2">{address.address2}</p>}
                <p className="text-ink-2">
                  {address?.city}, {address?.state} {address?.pincode}
                </p>
                {address?.phone && <p className="text-ink-2 mt-1">📞 {address.phone}</p>}
              </div>
            </div>
          ) : hasPartialAddress ? (
            <div className="text-sm text-amber-700">
              <p className="font-semibold">Address is incomplete.</p>
              <p className="mt-1 text-xs">
                Still needed: {missingAddressFields.join(', ')}. Tap “Edit” to fix it.
              </p>
            </div>
          ) : (
            <p className="text-sm text-amber-700">
              No delivery address yet. Go back to the Delivery step to add one.
            </p>
          )}
        </div>
      )}

      {/* Recipients summary (individual delivery) */}
      {deliveryMode === 'individual' && (
        <div className="bg-white rounded-md border-2 border-bdr p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Recipients</p>
            <button
              onClick={() => setCurrentStep(3)}
              className="text-xs font-semibold text-em hover:underline"
            >
              Edit
            </button>
          </div>
          <div className="flex items-center gap-3 text-sm text-ink">
            <Users className="h-5 w-5 text-ink-3" />
            {csvRecipientCount > 0 ? (
              <span className="font-semibold">{csvRecipientCount} recipients uploaded</span>
            ) : (
              <span className="text-amber-700">
                No recipients uploaded yet. Go back to the Delivery step to add them.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Preferred Delivery Date — read-only */}
      <div className="bg-white rounded-md border-2 border-bdr p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
            Estimated Delivery
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-ink">
          <CalendarDays className="h-5 w-5 text-ink-3" />
          {formattedDate ? (
            <span className="font-semibold">{formattedDate}</span>
          ) : (
            <span className="text-ink-3">Calculated from product lead times</span>
          )}
        </div>
      </div>

      {/* Incomplete notice */}
      {!deliveryComplete && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
          <p className="text-xs text-amber-800">
            {deliveryMode === 'single'
              ? `Please complete your delivery address before placing the order — still needed: ${missingAddressFields.join(', ')}.`
              : 'Please upload your recipients list in the Delivery step before placing the order.'}
          </p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4 pt-4">
        <Button
          onClick={() => setCurrentStep(3)}
          variant="outline"
          className="gap-2 rounded-md"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Delivery
        </Button>
        <Button
          onClick={handleProceedToCheckout}
          disabled={loading || !deliveryComplete}
          variant="em"
          className="gap-2 rounded-md"
        >
          {loading ? 'Processing...' : 'Review Order'}
          {!loading && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
