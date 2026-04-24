'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useBuilderStore } from '@/store/builder';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { clearAll } = useBuilderStore();

  useEffect(() => {
    clearAll();
  }, [clearAll]);

  if (!orderId) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-black text-ink mb-2">Oops!</h1>
          <p className="text-ink-3 mb-6">We couldn't find your order information.</p>
          <Button asChild variant="em" size="lg">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas py-12 px-4 relative overflow-hidden">
      {/* Confetti */}
      <style>{`
        @keyframes confetti-fall {
          to {
            transform: translateY(100vh) rotateZ(360deg);
            opacity: 0;
          }
        }
        @keyframes confetti-spin {
          from {
            transform: rotateZ(0deg);
          }
          to {
            transform: rotateZ(360deg);
          }
        }
        .confetti {
          position: fixed;
          width: 10px;
          height: 10px;
          pointer-events: none;
          animation: confetti-fall 3s ease-out forwards;
        }
        .confetti:nth-child(1) { left: 10%; background: #C4963C; animation-delay: 0s; }
        .confetti:nth-child(2) { left: 20%; background: #10B981; animation-delay: 0.1s; }
        .confetti:nth-child(3) { left: 30%; background: #6366F1; animation-delay: 0.2s; }
        .confetti:nth-child(4) { left: 40%; background: #F59E0B; animation-delay: 0.3s; }
        .confetti:nth-child(5) { left: 50%; background: #F43F5E; animation-delay: 0.4s; }
        .confetti:nth-child(6) { left: 60%; background: #0EA5E9; animation-delay: 0.5s; }
        .confetti:nth-child(7) { left: 70%; background: #8B5CF6; animation-delay: 0.6s; }
        .confetti:nth-child(8) { left: 80%; background: #14B8A6; animation-delay: 0.7s; }
        .confetti:nth-child(9) { left: 90%; background: #C4963C; animation-delay: 0.8s; }
        .confetti:nth-child(10) { left: 15%; background: #10B981; animation-delay: 0.9s; }
      `}</style>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="confetti" style={{ top: '-10px' }} />
      ))}

      {/* Content */}
      <div className="container-gc-w max-w-md mx-auto text-center relative z-10">
        {/* Celebration emoji */}
        <div className="text-6xl mb-6 animate-bounce">🎉</div>

        {/* Main heading */}
        <h1 className="text-4xl font-black text-ink mb-2">Your order is confirmed!</h1>
        <p className="text-ink-3 mb-8">
          Thank you for choosing GiftCraft. Your gift pack is being prepared with care.
        </p>

        {/* Order number badge */}
        <div className="mb-8 inline-block">
          <div className="rounded-md bg-gold-50 border-2 border-gold p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-700 mb-2">
              Order Number
            </p>
            <p className="text-2xl font-black text-gold-900 tabnum">
              {orderId.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 mb-8">
          <Button
            asChild
            variant="em"
            size="xl"
            className="w-full rounded-md"
          >
            <Link href={`/orders/${orderId}/track`}>Track Order</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full rounded-md"
          >
            <Link href="/">Back to Home</Link>
          </Button>
        </div>

        {/* Info box */}
        <div className="rounded-md bg-blue-50 border-2 border-blue-200 p-4">
          <p className="text-xs font-semibold text-blue-900 mb-1">What's Next?</p>
          <p className="text-xs text-blue-800 leading-relaxed">
            We'll send you email updates as your order moves through each stage. You can also track progress anytime using your order number.
          </p>
        </div>
      </div>
    </div>
  );
}
