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

interface HsnGstLine {
  hsnCode: string;
  gstRate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
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
    sleeve,
    deliveryMode,
    getProductsSubtotal,
    clearAll,
  } = useBuilderStore();

  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [loadingPlaceOrder, setLoadingPlaceOrder] = useState(false);
  const [quoteToken, setQuoteToken] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState<string | null>(null);

  const reviewItems: ReviewItem[] = useMemo(() => {
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      quantity: p.quantity,
      sellPrice: p.sellPrice,
      subtotal: p.sellPrice * p.quantity,
    }));
  }, [products]);

  const packagingTotal = packaging ? packaging.price * packQuantity : 0;
  const addonsTotal = addons.reduce((sum, a) => sum + a.price * packQuantity, 0);
  const sleeveTotal = sleeve ? 60 * packQuantity : 0;

  // Shipping rate based on delivery mode
  const shippingRatePerPack = deliveryMode === 'single' ? 90 : 140;
  const shippingFlat = shippingRatePerPack * packQuantity;

  // Compute pricing using per-HSN path
  const pricing = useMemo(() => {
    // Build products array with HSN info for new pricing engine
    const productsForPricing = products.map((p) => ({
      sellPrice: p.sellPrice,
      quantity: p.quantity,
      hsnCode: p.hsnCode || '4820',  // Default to 4820 if not set
      gstRate: p.gstRate || 18,      // Default to 18% if not set
    }));

    return computePricing({
      products: productsForPricing,
      packagingPerUnit: packaging?.price || 0,
      addonsPerUnit: addons.reduce((sum, a) => sum + a.price, 0) + (sleeve ? 60 : 0),
      packQuantity,
      shippingFlat,
      discount: couponDiscount,
      sellerStateCode: 'DL',
      buyerStateCode: shippingZone?.stateCode || 'DL',
      razorpayFeePct: 2.36,
      razorpayFeeGstPct: 18,
    });
  }, [products, packQuantity, packaging, addons, sleeve, shippingFlat, couponDiscount, shippingZone]);

  const handleApplyCoupon = () => {
    // Mock coupon validation - GIFT10 = 10% discount
    if (couponCode.toUpperCase() === 'GIFT10') {
      const productsSubtotal = getProductsSubtotal();
      setCouponDiscount(Math.round(productsSubtotal * 0.1 * 100) / 100);
      setCouponApplied(true);
    } else {
      alert('Invalid coupon code. Try GIFT10.');
    }
  };

  // Create quote once and cache the token
  const createQuote = async () => {
    if (quoteToken) return quoteToken;  // Already created

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
          discount: couponDiscount,
        }),
      });

      if (!quoteRes.ok) {
        throw new Error('Failed to create quote');
      }

      const quote = await quoteRes.json();
      setQuoteToken(quote.shareToken);
      setQuoteId(quote.id);
      return quote.shareToken;
    } catch (error) {
      console.error('Error creating quote:', error);
      throw error;
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const token = await createQuote();
      window.location.href = `/api/quotes/${token}/pdf`;
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF');
    }
  };

  const handleCopyShareLink = async () => {
    try {
      const token = await createQuote();
      const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/quote/${token}`;
      await navigator.clipboard.writeText(shareUrl);
      alert('Share link copied to clipboard!');
    } catch (error) {
      console.error('Error copying share link:', error);
      alert('Failed to copy link');
    }
  };

  const handleWhatsAppShare = async () => {
    try {
      const token = await createQuote();
      const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/quote/${token}`;
      const text = `Check out my GiftCraft quote: ${shareUrl}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    } catch (error) {
      console.error('Error sharing on WhatsApp:', error);
      alert('Failed to share on WhatsApp');
    }
  };

  const handlePlaceOrder = async () => {
    // Check if user is authenticated
    if (!session) {
      router.push('/login?callbackUrl=/checkout');
      return;
    }

    try {
      setLoadingPlaceOrder(true);
      const id = quoteId || (await createQuote()).split('-')[0];  // Fallback if needed
      router.push(`/checkout?quoteId=${id}`);
    } catch (error) {
      console.error('Error placing order:', error);
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

      {/* Delivery Mode Display */}
      <div className="rounded-gc-l bg-em-50 border-2 border-em-200 p-5">
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
        {(packaging || addons.length > 0 || sleeve) && (
          <div className="space-y-2 pb-3 border-b border-bdr">
            {packaging && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-2">{packaging.name}</p>
                <p className="text-sm font-semibold tabnum text-ink">
                  +{formatRupees(packagingTotal)}
                </p>
              </div>
            )}
            {sleeve && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-2">Branded Sleeve</p>
                <p className="text-sm font-semibold tabnum text-ink">
                  +{formatRupees(sleeveTotal)}
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
        <div className="flex items-center justify-between pb-3 border-b border-bdr">
          <div>
            <p className="text-sm text-ink-2">
              {deliveryMode === 'single' ? 'Single Location Shipping' : 'Individual Delivery'}
            </p>
            <p className="text-xs text-ink-3 mt-0.5">
              ₹{deliveryMode === 'single' ? 90 : 140}/pack × {packQuantity}
            </p>
          </div>
          <p className="text-sm font-semibold tabnum text-ink">
            +{formatRupees(shippingFlat)}
          </p>
        </div>
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

          {/* GST Breakdown by HSN */}
          {pricing.hsnBreakdown && pricing.hsnBreakdown.length > 0 && (
            <div className="border-t border-bdr py-2">
              <p className="text-xs font-semibold text-ink-2 px-2 mb-2">GST Breakdown</p>
              {pricing.hsnBreakdown.map((line: HsnGstLine, idx: number) => (
                <div key={`${line.hsnCode}-${idx}`} className="space-y-1 px-2 mb-2 pb-2 border-b border-bdr last:border-b-0">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-ink-3">HSN {line.hsnCode} @ {line.gstRate}%</span>
                    <span className="text-ink-2">{formatRupees(line.taxableAmount)}</span>
                  </div>
                  {line.cgst > 0 && (
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-ink-3">  CGST (9%)</span>
                      <span className="font-semibold tabnum text-ink">+{formatRupees(line.cgst)}</span>
                    </div>
                  )}
                  {line.sgst > 0 && (
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-ink-3">  SGST (9%)</span>
                      <span className="font-semibold tabnum text-ink">+{formatRupees(line.sgst)}</span>
                    </div>
                  )}
                  {line.igst > 0 && (
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-ink-3">  IGST (18%)</span>
                      <span className="font-semibold tabnum text-ink">+{formatRupees(line.igst)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Razorpay Fee */}
          {pricing.razorpayFee > 0 && (
            <div className="border-t border-bdr py-2">
              <div className="flex items-center justify-between py-1 px-2 text-xs">
                <span className="text-ink-2">Payment Gateway Fee</span>
                <span className="font-semibold tabnum text-ink">
                  +{formatRupees(pricing.razorpayFee)}
                </span>
              </div>
              <p className="text-[10px] text-ink-3 px-2 mt-0.5">
                (2.36% on payment amount + 18% GST)
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
          className="rounded-gc-l text-xs md:text-sm"
        >
          {loadingPlaceOrder ? 'Processing...' : 'Place Order'}
        </Button>
      </div>
    </div>
  );
}
