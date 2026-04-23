'use client';

import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useBuilderStore } from '@/store/builder';
import { formatRupees } from '@/lib/utils';
import { computePricing } from '@giftcraft/pricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Link2, MessageCircle } from 'lucide-react';

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
  } = useBuilderStore();

  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [loadingPlaceOrder, setLoadingPlaceOrder] = useState(false);
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
    const productsForPricing = products.map((p) => ({
      sellPrice: p.sellPrice,
      quantity: p.quantity,
      hsnCode: p.hsnCode || '4820',
      gstRate: p.gstRate || 18,
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
    if (couponCode.toUpperCase() === 'GIFT10') {
      const productsSubtotal = getProductsSubtotal();
      setCouponDiscount(Math.round(productsSubtotal * 0.1 * 100) / 100);
      setCouponApplied(true);
    } else {
      alert('Invalid coupon code. Try GIFT10.');
    }
  };

  const createQuote = async () => {
    if (quoteId) return quoteId;

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

      if (!quoteRes.ok) throw new Error('Failed to create quote');
      const quote = await quoteRes.json();
      setQuoteId(quote.id);
      return quote.id;
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
      alert('Failed to download PDF');
    }
  };

  const handleCopyShareLink = async () => {
    try {
      const token = await createQuote();
      const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/quote/${token}`;
      await navigator.clipboard.writeText(shareUrl);
      alert('Share link copied!');
    } catch (error) {
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
      alert('Failed to share on WhatsApp');
    }
  };

  const handlePlaceOrder = async () => {
    if (!session) {
      router.push('/login?callbackUrl=/builder');
      return;
    }

    try {
      setLoadingPlaceOrder(true);
      const id = quoteId || (await createQuote());
      router.push(`/checkout?quoteId=${id}`);
    } catch (error) {
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

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        {/* LEFT COLUMN: Order Summary & Actions */}
        <div className="space-y-6">
          {/* Order Summary Section */}
          <div className="bg-elevated rounded-gc-l border-2 border-bdr p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
              Order Summary
            </p>

            {/* Products */}
            <div className="space-y-2 pb-3 border-b border-bdr">
              {reviewItems.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink">{item.name}</p>
                    <p className="text-xs text-ink-3 mt-0.5">×{item.quantity}</p>
                  </div>
                  <p className="text-sm font-black tabnum text-ink flex-shrink-0">
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
                    <p className="text-sm font-semibold tabnum text-ink">+{formatRupees(packagingTotal)}</p>
                  </div>
                )}
                {sleeve && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-ink-2">Branded Sleeve</p>
                    <p className="text-sm font-semibold tabnum text-ink">+{formatRupees(sleeveTotal)}</p>
                  </div>
                )}
                {addons.length > 0 && (
                  <div className="space-y-1">
                    {addons.map((addon) => (
                      <div key={addon.id} className="flex items-center justify-between">
                        <p className="text-xs text-ink-2">{addon.name}</p>
                        <p className="text-xs font-semibold tabnum text-ink">+{formatRupees(addon.price * packQuantity)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Shipping */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-ink-2">
                  {deliveryMode === 'single' ? 'Single Location Shipping' : 'Individual Delivery'}
                </p>
                <p className="text-xs text-ink-3 mt-0.5">
                  ₹{deliveryMode === 'single' ? 90 : 140}/pack • {packQuantity} packs
                </p>
              </div>
              <p className="text-sm font-semibold tabnum text-ink flex-shrink-0">
                +{formatRupees(shippingFlat)}
              </p>
            </div>
          </div>

          {/* Coupon Code */}
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              disabled={couponApplied}
              className="flex-1 rounded-gc"
            />
            <Button
              onClick={handleApplyCoupon}
              disabled={couponApplied || !couponCode}
              variant="outline"
              className="rounded-gc px-6"
            >
              {couponApplied ? '✓ Applied' : 'Apply'}
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
              onClick={handleCopyShareLink}
              variant="outline"
              className="rounded-gc text-xs h-10 flex items-center justify-center gap-1"
            >
              <Link2 className="w-3 h-3" />
              <span className="hidden sm:inline">Copy</span>
            </Button>
            <Button
              onClick={handleWhatsAppShare}
              variant="outline"
              className="rounded-gc text-xs h-10 flex items-center justify-center gap-1"
            >
              <MessageCircle className="w-3 h-3" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
            <Button
              onClick={handlePlaceOrder}
              disabled={loadingPlaceOrder}
              variant="em"
              className="rounded-gc text-xs h-10 font-bold"
            >
              Place Order
            </Button>
          </div>

          {/* Next Step Info */}
          <div className="rounded-gc bg-em-50 border-2 border-em-200 p-4">
            <p className="text-xs text-em-700">
              <span className="font-semibold">Next Step:</span> Click "Place Order" to proceed to secure checkout.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Sticky Pricing Panel */}
        <div className="lg:sticky lg:top-8 h-fit space-y-4">
          {/* Order Summary Box */}
          <div className="rounded-gc-l border-2 border-bdr bg-elevated p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
              Order Summary
            </p>

            <div className="space-y-2">
              {reviewItems.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-2 pb-2 border-b border-bdr last:border-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-ink line-clamp-1">{item.name}</p>
                    <p className="text-[10px] text-ink-3">×{item.quantity}</p>
                  </div>
                  <p className="text-xs font-black text-ink tabnum flex-shrink-0">
                    {formatRupees(item.subtotal)}
                  </p>
                </div>
              ))}

              {(packaging || addons.length > 0 || sleeve) && (
                <>
                  {packaging && (
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-bdr">
                      <span className="text-ink-2">{packaging.name}</span>
                      <span className="font-semibold text-ink">+{formatRupees(packagingTotal)}</span>
                    </div>
                  )}
                  {sleeve && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-ink-2">Branded Sleeve</span>
                      <span className="font-semibold text-ink">+{formatRupees(sleeveTotal)}</span>
                    </div>
                  )}
                  {addons.map((addon) => (
                    <div key={addon.id} className="flex items-center justify-between text-xs">
                      <span className="text-ink-2">{addon.name}</span>
                      <span className="font-semibold text-ink">+{formatRupees(addon.price * packQuantity)}</span>
                    </div>
                  ))}
                </>
              )}

              {shippingZone && (
                <div className="flex items-center justify-between text-xs pt-2 border-t border-bdr">
                  <span className="text-ink-2">{shippingZone.zoneName}</span>
                  <span className="font-semibold text-ink">+{formatRupees(shippingFlat)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Breakdown Box */}
          <div className="rounded-gc-l border-2 border-bdr bg-white p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
              Pricing Breakdown
            </p>

            <div className="flex items-center justify-between pb-3 border-b border-bdr">
              <span className="text-sm text-ink-2">Subtotal</span>
              <span className="font-black text-ink tabnum">{formatRupees(pricing.subtotal)}</span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-bdr">
              <span className="text-sm text-ink-2">Shipping</span>
              <span className="font-black text-ink tabnum">+{formatRupees(shippingFlat)}</span>
            </div>

            {/* GST Breakdown */}
            <div className="space-y-2 pb-3 border-b border-bdr">
              <p className="text-xs font-semibold text-ink-2 mb-2">GST Breakdown</p>

              {pricing.hsnBreakdown && pricing.hsnBreakdown.length > 0 ? (
                <div className="space-y-1.5 text-xs">
                  {pricing.hsnBreakdown.map((line: HsnGstLine, idx: number) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between">
                        <span className="text-ink-3">HSN {line.hsnCode} @ {line.gstRate}%</span>
                        <span className="text-ink-3 font-mono">{formatRupees(line.taxableAmount)}</span>
                      </div>
                      {line.cgst > 0 && (
                        <div className="flex items-center justify-between ml-2">
                          <span className="text-ink-3">CGST ({line.gstRate / 2}%)</span>
                          <span className="text-ink-3 font-mono">+{formatRupees(line.cgst)}</span>
                        </div>
                      )}
                      {line.sgst > 0 && (
                        <div className="flex items-center justify-between ml-2">
                          <span className="text-ink-3">SGST ({line.gstRate / 2}%)</span>
                          <span className="text-ink-3 font-mono">+{formatRupees(line.sgst)}</span>
                        </div>
                      )}
                      {line.igst > 0 && (
                        <div className="flex items-center justify-between ml-2">
                          <span className="text-ink-3">IGST ({line.gstRate}%)</span>
                          <span className="text-ink-3 font-mono">+{formatRupees(line.igst)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Payment Fee */}
            {pricing.razorpayFee > 0 && (
              <div>
                <p className="text-sm text-ink-2">Payment Gateway Fee</p>
                <p className="text-xs text-ink-3 mt-1">(2.36% on payment amount + 18% GST)</p>
                <p className="text-sm font-black text-ink tabnum mt-2">
                  +{formatRupees(pricing.razorpayFee)}
                </p>
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
              <p className="text-xs text-white/70 mt-1">₹{Math.round(pricing.grandTotal / packQuantity)}</p>
            </div>
          </div>

          {/* Info Note */}
          <div className="bg-em-50 border-2 border-em-200 rounded-gc p-3">
            <p className="text-xs text-em-700 leading-relaxed">
              <span className="font-semibold">Note:</span> All prices include branding. Payment gateway fees are calculated at checkout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
