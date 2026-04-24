'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatRupees } from '@/lib/utils';
import { Download, Link2, MessageCircle } from 'lucide-react';
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
  const router = useRouter();
  const [couponCode, setCouponCode] = useState('');
  const [showCouponError, setShowCouponError] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('🔍 CheckoutSummary DEBUG:', {
      quoteId,
      userEmail,
      userName,
      userPhone,
      selectedPath,
      advanceAmount: Math.round(parseFloat(String(payload.pricing?.grandTotal || 0)) * 0.1 * 100) / 100,
      testModeEnabled: process.env.NEXT_PUBLIC_TEST_PAYMENT_MODE,
    });
  }, [quoteId, userEmail, userName, userPhone, selectedPath, payload]);

  const products = payload.products || [];
  const pricing = payload.pricing || {};
  const packaging = payload.packaging;
  const addons = payload.addons || [];
  const shippingZone = payload.shippingZone;

  const grandTotal = pricing.grandTotal || 0;
  const advanceAmount = Math.round(grandTotal * 0.1 * 100) / 100;
  const balanceAmount = grandTotal - advanceAmount;

  const handleCouponApply = () => {
    if (!couponCode.trim()) {
      setShowCouponError(true);
      return;
    }
    setShowCouponError(false);
    // Handle coupon application
  };

  const handleDownloadPDF = () => {
    alert('PDF download will be implemented');
  };

  const handleCopyLink = () => {
    alert('Copy link will be implemented');
  };

  const handleWhatsApp = () => {
    alert('WhatsApp share will be implemented');
  };

  const handleConfirmOrder = async () => {
    if (selectedPath === 'mockup' && quoteId) {
      setOrderLoading(true);
      try {
        console.log('📝 Confirming order with:', {
          quoteId,
          deliveryMode: payload.deliveryMode,
          userName,
          userEmail,
          userPhone,
        });

        const orderRes = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quoteId,
            deliveryMode: payload.deliveryMode || 'single',
            cardMessage: payload.cardMessage || '',
            billingJson: {
              companyName: userName,
              email: userEmail,
              phone: userPhone,
            },
          }),
        });

        const responseData = await orderRes.json();

        if (!orderRes.ok) {
          console.error('❌ Order creation failed:', orderRes.status, responseData);
          throw new Error(responseData.error || `Failed (${orderRes.status})`);
        }

        console.log('✅ Order created:', responseData);
        router.push(`/checkout/success?orderId=${responseData.id}`);
      } catch (error: any) {
        console.error('❌ Error:', error);
        alert(`Failed: ${error.message}`);
        setOrderLoading(false);
      }
    }
  };

  return (
    <div className="space-y-4">

      {/* Pricing Breakdown Box */}
      <div className="rounded-md border-2 border-bdr bg-white p-5 space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-2">
          Price Breakdown
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 px-2 text-sm">
            <span className="text-ink-2">Subtotal</span>
            <span className="font-bold text-ink tabular-nums">{formatRupees(pricing.subtotal)}</span>
          </div>

          {pricing.shipping > 0 && (
            <div className="flex items-center justify-between py-2 px-2 bg-elevated rounded text-sm">
              <span className="text-ink-2">Shipping</span>
              <span className="font-bold text-ink tabular-nums">+{formatRupees(pricing.shipping)}</span>
            </div>
          )}

          {/* GST Breakdown */}
          <div className="space-y-2 py-2 border-t border-bdr">
            <p className="text-xs font-bold text-ink-2 mb-2">GST Breakdown</p>

            {pricing.hsnBreakdown && pricing.hsnBreakdown.length > 0 ? (
              <div className="space-y-1.5 text-xs">
                {pricing.hsnBreakdown.map((line: any, idx: number) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-2">HSN {line.hsnCode} @ {line.gstRate}%</span>
                      <span className="text-ink-2 font-mono">{formatRupees(line.taxableAmount)}</span>
                    </div>
                    {line.cgst > 0 && (
                      <div className="flex items-center justify-between ml-3">
                        <span className="text-ink-2">CGST ({line.gstRate / 2}%)</span>
                        <span className="text-ink-2 font-mono">+{formatRupees(line.cgst)}</span>
                      </div>
                    )}
                    {line.sgst > 0 && (
                      <div className="flex items-center justify-between ml-3">
                        <span className="text-ink-2">SGST ({line.gstRate / 2}%)</span>
                        <span className="text-ink-2 font-mono">+{formatRupees(line.sgst)}</span>
                      </div>
                    )}
                    {line.igst > 0 && (
                      <div className="flex items-center justify-between ml-3">
                        <span className="text-ink-2">IGST ({line.gstRate}%)</span>
                        <span className="text-ink-2 font-mono">+{formatRupees(line.igst)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1 text-xs">
                {pricing.cgst > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-ink-2">CGST (9%)</span>
                    <span className="text-ink-2 font-mono">+{formatRupees(pricing.cgst)}</span>
                  </div>
                )}
                {pricing.sgst > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-ink-2">SGST (9%)</span>
                    <span className="text-ink-2 font-mono">+{formatRupees(pricing.sgst)}</span>
                  </div>
                )}
                {pricing.igst > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-ink-2">IGST (18%)</span>
                    <span className="text-ink-2 font-mono">+{formatRupees(pricing.igst)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment Gateway Fee */}
          {pricing.razorpayFee > 0 && (
            <div className="flex items-start justify-between py-2 px-2 border-t border-bdr">
              <div>
                <p className="text-sm text-ink-2 font-semibold">Payment Gateway Fee</p>
                <p className="text-xs text-ink-3 mt-1">(2.36% on payment amount + 18% GST)</p>
              </div>
              <span className="font-bold text-ink tabular-nums flex-shrink-0">+{formatRupees(pricing.razorpayFee)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Grand Total */}
      <div className="rounded-full bg-ink text-white px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold opacity-80">Grand Total</p>
          <p className="text-xs text-white/60 mt-1">Per pack</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black tabular-nums">{formatRupees(pricing.grandTotal)}</p>
          <p className="text-xs text-white/60 mt-1">₹{Math.round(pricing.grandTotal / payload.packQuantity)}</p>
        </div>
      </div>

      {/* Coupon Code */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Enter coupon code"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          className="rounded-2xl flex-1 h-10 px-3 border-2 border-bdr text-sm"
        />
        <Button
          onClick={handleCouponApply}
          variant="outline"
          className="rounded-2xl h-10 px-4 text-sm font-semibold border-2 border-bdr"
        >
          Apply
        </Button>
      </div>

      {/* Path-specific Pricing Info */}
      {selectedPath === 'pricelock' && (
        <>
          <div className="rounded-2xl bg-yellow-50 border-2 border-yellow-300 p-4">
            <p className="text-xs text-yellow-800">
              <span className="font-semibold">⏰ Price Lock Guarantee:</span> By paying 10% advance, your quoted prices are locked for 30 days regardless of any price changes. The remaining 90% is due only after you approve the mockups.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-ink">10% Advance Payment</span>
              <span className="text-sm font-black text-yellow-700 tabular-nums">{formatRupees(advanceAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-2 italic">Balance due after mockup approval</span>
              <span className="font-bold text-ink tabular-nums">{formatRupees(balanceAmount)}</span>
            </div>
            <div className="rounded-2xl bg-yellow-100 border border-yellow-400 p-2 mt-2">
              <p className="text-xs text-yellow-800 font-semibold">💰 Prices locked for 30 days from advance payment date.</p>
            </div>
          </div>
        </>
      )}

      {selectedPath === 'mockup' && (
        <div className="rounded-2xl bg-green-50 border-2 border-green-300 p-4">
          <p className="text-xs text-green-800">
            <span className="font-semibold">✓ No payment required now.</span> Confirm your order and we'll create mockups for your approval first.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className={selectedPath === 'mockup' ? 'grid grid-cols-4 gap-2' : 'grid grid-cols-1'}>
        {selectedPath === 'mockup' ? (
          <>
            <Button
              onClick={handleDownloadPDF}
              variant="outline"
              className="rounded-2xl text-xs h-10 flex items-center justify-center gap-1 border-2 border-bdr"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="rounded-2xl text-xs h-10 flex items-center justify-center gap-1 border-2 border-bdr"
            >
              <Link2 className="w-3 h-3" />
              <span className="hidden sm:inline">Copy</span>
            </Button>
            <Button
              onClick={handleWhatsApp}
              variant="outline"
              className="rounded-2xl text-xs h-10 flex items-center justify-center gap-1 border-2 border-bdr"
            >
              <MessageCircle className="w-3 h-3" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
            <Button
              onClick={handleConfirmOrder}
              disabled={orderLoading}
              className="rounded-2xl text-xs h-10 font-bold bg-green-700 text-white hover:bg-green-800 disabled:opacity-50"
            >
              {orderLoading ? 'Processing...' : '✓ Confirm Order & Get Mockups'}
            </Button>
          </>
        ) : (
          <RazorpayButton
            quoteId={quoteId}
            amount={advanceAmount}
            email={userEmail}
            phone={userPhone}
            companyName={userName}
            buttonText={`🔒 Pay ${formatRupees(advanceAmount)} & Lock Prices`}
          />
        )}
      </div>

      {/* Legal Text */}
      <p className="text-xs text-ink-2 text-center">
        By confirming, you agree to our <a href="#" className="text-green-700 hover:underline">Terms of Service</a>, <a href="#" className="text-green-700 hover:underline">Privacy Policy</a>, and <a href="#" className="text-green-700 hover:underline">Refund Policy</a>. GST-compliant invoice will be generated upon payment.
      </p>
    </div>
  );
}
