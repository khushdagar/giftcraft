import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { CheckoutSummary } from '@/components/checkout/checkout-summary';
import { formatRupees } from '@/lib/utils';
import { Check } from 'lucide-react';

const TIMELINE_STEPS = [
  { label: 'Quote', icon: '📋' },
  { label: 'Mockup', icon: '🎨' },
  { label: 'Approval', icon: '✓' },
  { label: 'Production', icon: '🏭' },
  { label: 'QC', icon: '🔍' },
  { label: 'Dispatch', icon: '📦' },
  { label: 'Delivered', icon: '🚚' },
];

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: { quoteId?: string };
}) {
  // Require authentication
  const session = await auth();
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
          <a
            href="/builder"
            className="text-em font-semibold hover:underline"
          >
            Back to Builder
          </a>
        </div>
      </div>
    );
  }

  // Fetch quote
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: {
      id: true,
      payload: true,
      expiresAt: true,
      status: true,
    },
  });

  if (!quote || quote.status !== 'active') {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-black text-ink mb-2">Quote Not Found</h1>
          <p className="text-ink-3 mb-4">This quote is no longer available</p>
          <a
            href="/builder"
            className="text-em font-semibold hover:underline"
          >
            Build a New Pack
          </a>
        </div>
      </div>
    );
  }

  // Check expiry
  if (quote.expiresAt < new Date()) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-black text-ink mb-2">Quote Expired</h1>
          <p className="text-ink-3 mb-4">
            This quote expired on {quote.expiresAt.toLocaleDateString()}
          </p>
          <a
            href="/builder"
            className="text-em font-semibold hover:underline"
          >
            Build a Fresh Pack
          </a>
        </div>
      </div>
    );
  }

  const payload = quote.payload as any;
  const grandTotal = payload.pricing?.grandTotal || 0;
  const advanceAmount = Math.round(grandTotal * 0.1 * 100) / 100;
  const balanceAmount = grandTotal - advanceAmount;

  return (
    <div className="min-h-screen bg-canvas py-8 px-4">
      <div className="container-gc-w max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-ink">Checkout</h1>
          <p className="text-ink-3 mt-1">Review your order and complete payment</p>
        </div>

        {/* Timeline */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-4">
            Order Timeline
          </p>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {TIMELINE_STEPS.map((step, idx) => (
              <div key={step.label} className="flex items-center gap-2 flex-shrink-0">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-base">
                    {step.icon}
                  </div>
                  <p className="text-[10px] text-ink-3 mt-1 whitespace-nowrap">{step.label}</p>
                </div>
                {idx < TIMELINE_STEPS.length - 1 && (
                  <div className="w-6 h-1 bg-gray-200 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Path Selection */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-4">
            Choose Your Payment Path
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Path A: Mockup First */}
            <div className="rounded-gc-l border-2 border-emerald-300 bg-emerald-50 p-6 cursor-pointer hover:shadow-lg transition">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-black text-emerald-900">Path A</h3>
                  <p className="text-xs text-emerald-700 mt-1">Approve Mockup First</p>
                </div>
                <div className="text-2xl">✨</div>
              </div>
              <div className="space-y-3 mb-4 pb-4 border-b border-emerald-200">
                <div className="flex items-center gap-2 text-sm text-emerald-800">
                  <Check className="h-4 w-4" />
                  <span>₹0 now</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-emerald-800">
                  <Check className="h-4 w-4" />
                  <span>Review mockup design</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-emerald-800">
                  <Check className="h-4 w-4" />
                  <span>Request revisions free</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-emerald-800">
                  <Check className="h-4 w-4" />
                  <span>Pay full amount at approval</span>
                </div>
              </div>
              <p className="text-xs text-emerald-600">
                Full amount: <span className="font-black text-emerald-900">{formatRupees(grandTotal)}</span>
              </p>
            </div>

            {/* Path B: Price Lock */}
            <div className="rounded-gc-l border-2 border-amber-300 bg-amber-50 p-6 cursor-pointer hover:shadow-lg transition">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-black text-amber-900">Path B</h3>
                  <p className="text-xs text-amber-700 mt-1">Lock Price Now</p>
                </div>
                <div className="text-2xl">🔒</div>
              </div>
              <div className="space-y-3 mb-4 pb-4 border-b border-amber-200">
                <div className="flex items-center gap-2 text-sm text-amber-800">
                  <Check className="h-4 w-4" />
                  <span>Pay 10% advance now</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-amber-800">
                  <Check className="h-4 w-4" />
                  <span>Price locked in</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-amber-800">
                  <Check className="h-4 w-4" />
                  <span>Production starts immediately</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-amber-800">
                  <Check className="h-4 w-4" />
                  <span>Pay balance before delivery</span>
                </div>
              </div>
              <div className="space-y-2 text-xs text-amber-700">
                <p>Advance: <span className="font-black text-amber-900">{formatRupees(advanceAmount)}</span></p>
                <p>Balance: <span className="font-black text-amber-900">{formatRupees(balanceAmount)}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8">
          {/* Left: Order Summary (read-only) */}
          <div className="order-2 lg:order-1">
            <CheckoutSummary payload={payload} />
          </div>

          {/* Right: Checkout Form */}
          <div className="order-1 lg:order-2">
            <CheckoutForm
              quoteId={quoteId}
              userEmail={session.user?.email || ''}
              userName={session.user?.name || ''}
              pricing={payload.pricing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
