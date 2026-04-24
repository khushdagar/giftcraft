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
  const [userPhone, setUserPhone] = useState('');

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
  const [error, setError] = useState<string | null>(null);

  if (loading && !quoteData && !error) {
    // Fetch on client side
    fetch(`/api/quotes/${quoteId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to load quote');
        }
        return res.json();
      })
      .then((data) => {
        setQuoteData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load quote');
        setLoading(false);
      });

    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <p className="text-ink-3">Loading checkout...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-black text-ink mb-2">Error Loading Quote</h1>
          <p className="text-ink-3 mb-4">{error}</p>
          <a href="/builder" className="text-em font-semibold hover:underline">
            Build a New Pack
          </a>
        </div>
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

  const payload = quoteData?.payload as any;

  if (!payload) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-black text-ink mb-2">Invalid Quote Data</h1>
          <p className="text-ink-3 mb-4">Quote data is missing or corrupted</p>
          <a href="/builder" className="text-em font-semibold hover:underline">
            Build a New Pack
          </a>
        </div>
      </div>
    );
  }

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
              onPhoneChange={setUserPhone}
            />
          </div>

          {/* Right: Sticky Pricing Panel */}
          <div className="lg:sticky lg:top-8 h-fit">
            <CheckoutSummary
              payload={payload}
              selectedPath={selectedPath}
              quoteId={quoteId}
              userEmail={session.user?.email || ''}
              userName={session.user?.name || ''}
              userPhone={userPhone}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
