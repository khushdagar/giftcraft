'use client';

import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useBuilderStore } from '@/store/builder';
import { formatRupees } from '@/lib/utils';
import { computePricing } from '@giftcraft/pricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Share2 } from 'lucide-react';

interface ReviewItem {
  id: string;
  name: string;
  quantity: number;
  sellPrice: number;
  subtotal: number;
}

export function Step4Review() {
  const router = useRouter();
  const { data: session } = useSession();

  const {
    products,
    packQuantity,
    packaging,
    addons,
    shippingZone,
    getProductsSubtotal,
    clearAll,
  } = useBuilderStore();

  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [loadingPlaceOrder, setLoadingPlaceOrder] = useState(false);

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

  // Compute pricing
  const pricing = useMemo(() => {
    return computePricing({
      productsSubtotal,
      packagingPerUnit: packaging?.price || 0,
      addonsPerUnit: addons.reduce((sum, a) => sum + a.price, 0),
      quantity: packQuantity,
      shippingFlat,
      discount: couponDiscount,
      sellerStateCode: 'DL',
      buyerStateCode: shippingZone?.stateCode || 'DL',
      effectiveGstRate: 18,
      razorpayFeePct: 2,
      razorpayFeeGstPct: 18,
    });
  }, [productsSubtotal, packQuantity, packaging, addons, shippingFlat, couponDiscount, shippingZone]);

  const handleApplyCoupon = () => {
    // TODO: Call API to validate coupon
    // For now, mock a 10% discount
    if (couponCode.toUpperCase() === 'DEMO10') {
      setCouponDiscount(Math.round(productsSubtotal * 0.1 * 100) / 100);
      setCouponApplied(true);
    } else {
      alert('Coupon code not found');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      // POST to /api/quotes to create quote
      const quoteRes = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products,
          packQuantity,
          packaging,
          addons,
          shippingZone,
          pricing,
          deliveryMode: useBuilderStore.getState().deliveryMode,
        }),
      });

      const quote = await quoteRes.json();
      // Redirect to PDF route
      window.location.href = `/api/quotes/${quote.shareToken}/pdf`;
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF');
    }
  };

  const handleCopyShareLink = async () => {
    try {
      // POST to /api/quotes to create quote
      const quoteRes = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products,
          packQuantity,
          packaging,
          addons,
          shippingZone,
          pricing,
          deliveryMode: useBuilderStore.getState().deliveryMode,
        }),
      });

      const quote = await quoteRes.json();
      const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/quote/${quote.shareToken}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      alert('Share link copied to clipboard!');
    } catch (error) {
      console.error('Error copying share link:', error);
      alert('Failed to copy link');
    }
  };

  const handleWhatsAppShare = async () => {
    try {
      // POST to /api/quotes to create quote
      const quoteRes = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products,
          packQuantity,
          packaging,
          addons,
          shippingZone,
          pricing,
          deliveryMode: useBuilderStore.getState().deliveryMode,
        }),
      });

      const quote = await quoteRes.json();
      const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/quote/${quote.shareToken}`;
      const text = `Check out my GiftCraft quote: ${shareUrl}`;

      // Open WhatsApp
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    } catch (error) {
      console.error('Error sharing on WhatsApp:', error);
    }
  };

  const handlePlaceOrder = async () => {
    // Check if user is authenticated
    if (!session) {
      // Redirect to login with callback to checkout
      router.push('/login?callbackUrl=/checkout');
      return;
    }

    // User is authenticated, proceed to checkout
    try {
      setLoadingPlaceOrder(true);

      // Create quote first
      const quoteRes = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products,
          packQuantity,
          packaging,
          addons,
          shippingZone,
          pricing,
          deliveryMode: useBuilderStore.getState().deliveryMode,
        }),
      });

      const quote = await quoteRes.json();

      // Redirect to checkout with quote ID
      router.push(`/checkout?quoteId=${quote.id}`);
    } catch (error) {
      console.error('Error creating quote:', error);
      alert('Failed to proceed to checkout');
    } finally {
      setLoadingPlaceOrder(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="overline text-ink-3">STEP 04</p>
        <h2 className="text-3xl font-black mt-1">Review & Order</h2>
      </div>

      {/* Order Summary */}
      <div className="rounded-gc-l bg-elevated border-2 border-bdr p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
          Order Summary
        </p>

        {/* Products */}
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
              <p className="text-xs text-ink-3 mt-0.5">
                {shippingZone.etaMinDays}–{shippingZone.etaMaxDays} days
              </p>
            </div>
            <p className="text-sm font-semibold tabnum text-ink">
              +{formatRupees(shippingFlat)}
            </p>
          </div>
        )}
      </div>

      {/* Pricing Breakdown */}
      <div className="rounded-gc-l border-2 border-bdr bg-white p-5 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-3">
          Pricing Breakdown
        </p>

        {/* Rows with alternating backgrounds */}
        <div className="space-y-1">
          <div className="flex items-center justify-between py-2 px-2">
            <span className="text-sm text-ink-2">Subtotal</span>
            <span className="font-semibold tabnum text-ink">
              {formatRupees(pricing.subtotal)}
            </span>
          </div>

          {pricing.packaging > 0 && (
            <div className="flex items-center justify-between py-2 px-2 bg-elevated/50 rounded">
              <span className="text-sm text-ink-2">Packaging</span>
              <span className="font-semibold tabnum text-ink">
                +{formatRupees(pricing.packaging)}
              </span>
            </div>
          )}

          {pricing.addons > 0 && (
            <div className="flex items-center justify-between py-2 px-2">
              <span className="text-sm text-ink-2">Add-ons</span>
              <span className="font-semibold tabnum text-ink">
                +{formatRupees(pricing.addons)}
              </span>
            </div>
          )}

          {pricing.shipping > 0 && (
            <div className="flex items-center justify-between py-2 px-2 bg-elevated/50 rounded">
              <span className="text-sm text-ink-2">Shipping</span>
              <span className="font-semibold tabnum text-ink">
                +{formatRupees(pricing.shipping)}
              </span>
            </div>
          )}

          {/* GST Section */}
          <div className="border-t border-bdr py-2">
            {pricing.cgst > 0 && (
              <div className="flex items-center justify-between py-1 px-2 text-xs">
                <span className="text-ink-2">CGST (9%)</span>
                <span className="font-semibold tabnum text-ink">
                  +{formatRupees(pricing.cgst)}
                </span>
              </div>
            )}
            {pricing.sgst > 0 && (
              <div className="flex items-center justify-between py-1 px-2 text-xs bg-elevated/50 rounded">
                <span className="text-ink-2">SGST (9%)</span>
                <span className="font-semibold tabnum text-ink">
                  +{formatRupees(pricing.sgst)}
                </span>
              </div>
            )}
            {pricing.igst > 0 && (
              <div className="flex items-center justify-between py-1 px-2 text-xs">
                <span className="text-ink-2">IGST (18%)</span>
                <span className="font-semibold tabnum text-ink">
                  +{formatRupees(pricing.igst)}
                </span>
              </div>
            )}
          </div>

          {/* Razorpay Fee */}
          {pricing.razorpayFee > 0 && (
            <div className="border-t border-bdr py-2">
              <div className="flex items-center justify-between py-1 px-2 text-xs">
                <span className="text-ink-2">Payment Processing Fee</span>
                <span className="font-semibold tabnum text-ink">
                  +{formatRupees(pricing.razorpayFee)}
                </span>
              </div>
              <p className="text-[10px] text-ink-3 px-2 mt-0.5">
                (2% + 18% GST on fee)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Grand Total Block (Dark) */}
      <div className="rounded-gc-l bg-dark text-inv p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">Grand Total</span>
          <p className="text-3xl font-black tabnum">
            {formatRupees(pricing.grandTotal)}
          </p>
        </div>
        {packQuantity > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs">Per pack</span>
            <span className="rounded-gc-p bg-gold-50 text-gold-700 px-3 py-1.5 text-sm font-semibold tabnum">
              {formatRupees(pricing.perPack)}
            </span>
          </div>
        )}
      </div>

      {/* Coupon Code */}
      <div className="rounded-gc border-2 border-bdr flex gap-2 p-3">
        <Input
          type="text"
          placeholder="Enter coupon code"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          disabled={couponApplied}
          className="flex-1 rounded-gc text-sm"
        />
        <Button
          onClick={handleApplyCoupon}
          disabled={couponApplied || !couponCode}
          variant="outline"
          className="rounded-gc-l"
        >
          {couponApplied ? '✓ Applied' : 'Apply'}
        </Button>
      </div>

      {/* Actions Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Button
          onClick={handleDownloadPDF}
          variant="outline"
          className="rounded-gc-l text-xs md:text-sm"
        >
          Download PDF
        </Button>
        <Button
          onClick={handleCopyShareLink}
          variant="ghost"
          className="rounded-gc-l text-xs md:text-sm gap-1"
        >
          <Copy className="h-4 w-4" />
          Copy Link
        </Button>
        <Button
          onClick={handleWhatsAppShare}
          variant="ghost"
          className="rounded-gc-l text-xs md:text-sm"
        >
          <Share2 className="h-4 w-4" />
          WhatsApp
        </Button>
        <Button
          onClick={handlePlaceOrder}
          disabled={loadingPlaceOrder}
          variant="em"
          className="rounded-gc-l col-span-2 md:col-span-1 text-xs md:text-sm"
        >
          {loadingPlaceOrder ? 'Processing...' : 'Place Order'}
        </Button>
      </div>

      {/* Info */}
      <div className="rounded-gc bg-blue-50 border border-blue-200 p-4">
        <p className="text-xs font-semibold text-blue-900 mb-1">ℹ️ Next Step</p>
        <p className="text-xs text-blue-800 leading-relaxed">
          Click "Place Order" to proceed to secure checkout. You'll review your order one more time and complete payment via Razorpay.
        </p>
      </div>
    </div>
  );
}
