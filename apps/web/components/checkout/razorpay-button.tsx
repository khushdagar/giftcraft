'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { formatRupees } from '@/lib/utils';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayButtonProps {
  quoteId: string;
  amount: number;
  email: string;
  phone: string;
  companyName: string;
}

export function RazorpayButton({
  quoteId,
  amount,
  email,
  phone,
  companyName,
}: RazorpayButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => console.error('Failed to load Razorpay');
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async () => {
    if (!razorpayLoaded || !window.Razorpay) {
      alert('Payment gateway is loading. Please try again.');
      return;
    }

    setLoading(true);

    try {
      // Open Razorpay modal
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: Math.round(amount * 100), // Convert to paise
        currency: 'INR',
        name: 'GiftCraft',
        description: `Gift Pack Order - ${companyName}`,
        prefill: {
          name: companyName,
          email: email,
          contact: phone,
        },
        handler: async (response: any) => {
          try {
            // Payment succeeded, create order
            const orderRes = await fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                quoteId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                billingJson: {
                  companyName,
                  email,
                  phone,
                },
              }),
            });

            if (!orderRes.ok) {
              throw new Error('Failed to create order');
            }

            const order = await orderRes.json();
            router.push(`/checkout/success?orderId=${order.id}`);
          } catch (error) {
            console.error('Error creating order:', error);
            alert('Order creation failed. Please contact support.');
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            console.log('Payment modal closed');
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Error opening Razorpay:', error);
      alert('Failed to open payment gateway');
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={loading || !razorpayLoaded || !email || !phone || amount <= 0}
      variant="em"
      size="xl"
      className="w-full rounded-gc-l"
    >
      {loading ? 'Processing...' : `Pay ${formatRupees(amount)}`}
    </Button>
  );
}
