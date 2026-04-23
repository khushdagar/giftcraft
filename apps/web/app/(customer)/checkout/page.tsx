'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { CheckoutSummary } from '@/components/checkout/checkout-summary';

export default function CheckoutPage({
  searchParams,
}: {
  searchParams: { quoteId?: string };
}) {
  const { data: session } = useSession();
  const [selectedPath, setSelectedPath] = useState<'mockup' | 'pricelock'>('mockup');

  if (!session) {
    redirect('/login?callbackUrl=/checkout');
  }

  const quoteId = searchParams.quoteId;
  if (!quoteId) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-black text-ink mb-2">Invalid Quote</h1>
          <p className="text-ink-3 mb-4">No quote ID provided</p>
          <a href="/builder" className="text-em font-semibold hover:underline">
            Back to Builder
          </a>
        </div>
      </div>
    );
  }

  // Fetch quote data from API instead
  const [quoteData, setQuoteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  if (loading && !quoteData) {
    // Fetch on client side
    fetch(`/api/quotes/${quoteId}`)
      .then((res) => res.json())
      .then((data) => {
        setQuoteData(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <p className="text-ink-3">Loading checkout...</p>
      </div>
    );
  }

  if (!quoteData) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-black text-ink mb-2">Quote Not Found</h1>
          <p className="text-ink-3 mb-4">This quote is no longer available</p>
          <a href="/builder" className="text-em font-semibold hover:underline">
            Build a New Pack
          </a>
        </div>
      </div>
    );
  }

  const payload = quoteData.payload as any;

  return (
    <div className="min-h-screen bg-canvas py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-black text-ink">Checkout.</h1>
          <p className="text-ink-3 mt-1">Review your order, provide billing details, and choose how you'd like to proceed.</p>
        </div>

        {/* Two-Column Layout: Form (Left) + Pricing (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Left: All Form Sections */}
          <div>
            <CheckoutForm
              quoteId={quoteId}
              userEmail={session.user?.email || ''}
              userName={session.user?.name || ''}
              pricing={payload.pricing}
              payload={payload}
              onPathChange={setSelectedPath}
            />
          </div>

          {/* Right: Sticky Pricing Panel */}
          <div className="lg:sticky lg:top-8 h-fit">
            <CheckoutSummary payload={payload} selectedPath={selectedPath} />
          </div>
        </div>
      </div>
    </div>
  );
}
