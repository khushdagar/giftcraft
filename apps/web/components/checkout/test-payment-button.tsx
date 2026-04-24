'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { formatRupees } from '@/lib/utils';

interface TestPaymentButtonProps {
  quoteId: string;
  amount: number;
  email: string;
  phone: string;
  companyName: string;
  buttonText?: string;
}

export function TestPaymentButton({
  quoteId,
  amount,
  email,
  phone,
  companyName,
  buttonText,
}: TestPaymentButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleTestPayment = async () => {
    setLoading(true);

    try {
      // Create fake test order without Razorpay
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId,
          razorpayOrderId: `test_${Date.now()}`, // Fake Razorpay order ID
          razorpayPaymentId: `pay_test_${Date.now()}`, // Fake payment ID
          isTestOrder: true, // Mark as test order
          billingJson: {
            companyName,
            email,
            phone,
          },
        }),
      });

      if (!orderRes.ok) {
        throw new Error('Failed to create test order');
      }

      const order = await orderRes.json();
      router.push(`/checkout/success?orderId=${order.id}&isTest=true`);
    } catch (error) {
      console.error('Error creating test order:', error);
      alert('Test order creation failed. Please check console.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleTestPayment}
        disabled={loading || !email || !phone || amount < 0}
        variant="outline"
        size="xl"
        className="w-full rounded-md border-2 border-dashed border-amber-400"
      >
        {loading ? 'Creating Test Order...' : (buttonText || `🧪 TEST: ${formatRupees(amount)}`)}
      </Button>
      <p className="text-xs text-amber-700 text-center font-semibold">
        (Development Mode Only - 10% OFF applied)
      </p>
    </div>
  );
}
