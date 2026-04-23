import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { CheckoutSummary } from '@/components/checkout/checkout-summary';
import { formatRupees } from '@/lib/utils';

const TIMELINE_STEPS = [
  { label: 'Quote', number: 1 },
  { label: 'Mockup', number: 2 },
  { label: 'Approval', number: 3 },
  { label: 'Production', number: 4 },
  { label: 'QC', number: 5 },
  { label: 'Dispatch', number: 6 },
  { label: 'Delivered', number: 7 },
];

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: { quoteId?: string };
}) {
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
          <a href="/builder" className="text-em font-semibold hover:underline">
            Back to Builder
          </a>
        </div>
      </div>
    );
  }

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
          <a href="/builder" className="text-em font-semibold hover:underline">
            Build a New Pack
          </a>
        </div>
      </div>
    );
  }

  if (quote.expiresAt < new Date()) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-black text-ink mb-2">Quote Expired</h1>
          <p className="text-ink-3 mb-4">
            This quote expired on {quote.expiresAt.toLocaleDateString()}
          </p>
          <a href="/builder" className="text-em font-semibold hover:underline">
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-ink">Checkout</h1>
          <p className="text-ink-3 mt-2">Review your order and complete payment</p>
        </div>

        {/* Process Timeline */}
        <div className="mb-10 bg-white rounded-gc-l border-2 border-bdr p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-6">
            Order Process Flow
          </p>
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
            {TIMELINE_STEPS.map((step, idx) => (
              <div key={step.label} className="flex items-center flex-shrink-0 gap-0">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-dark text-white flex items-center justify-center font-black text-lg">
                    {step.number}
                  </div>
                  <p className="text-xs font-semibold text-ink-3 mt-3 text-center whitespace-nowrap px-1">
                    {step.label}
                  </p>
                </div>
                {idx < TIMELINE_STEPS.length - 1 && (
                  <div className="w-8 h-1 bg-gradient-to-r from-dark to-dark/70 flex-shrink-0 mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content: Form + Pricing Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          {/* Left: Form */}
          <div>
            {/* Path Selection */}
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-4">
                Payment Method
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {/* Path A */}
                <div className="rounded-gc-l border-2 border-em-400 bg-em-50 p-5 cursor-pointer hover:shadow-card transition">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-5 h-5 rounded-full border-2 border-em-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-base font-black text-em-700">Path A: Mockup First</h3>
                      <p className="text-xs text-em-600 mt-1">No payment now, pay after approval</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-xs text-em-700 mb-4">
                    <li>• ₹0 due now</li>
                    <li>• Review mockup (48 hours)</li>
                    <li>• Free revisions (2 times)</li>
                    <li>• Pay full amount at approval</li>
                  </ul>
                  <p className="text-xs font-black text-em-700">Full: {formatRupees(grandTotal)}</p>
                </div>

                {/* Path B */}
                <div className="rounded-gc-l border-2 border-gold-200 bg-gold-50 p-5 cursor-pointer hover:shadow-card transition">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-5 h-5 rounded-full border-2 border-gold-700 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-base font-black text-gold-700">Path B: Price Lock</h3>
                      <p className="text-xs text-gold-700/80 mt-1">Pay 10% now, lock in price</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-xs text-gold-700 mb-4">
                    <li>• {formatRupees(advanceAmount)} due now (10%)</li>
                    <li>• Price locked</li>
                    <li>• Production starts immediately</li>
                    <li>• Pay balance before delivery</li>
                  </ul>
                  <p className="text-xs"><span className="font-black text-gold-700">Balance: {formatRupees(balanceAmount)}</span></p>
                </div>
              </div>
            </div>

            {/* Checkout Form */}
            <CheckoutForm
              quoteId={quoteId}
              userEmail={session.user?.email || ''}
              userName={session.user?.name || ''}
              pricing={payload.pricing}
            />
          </div>

          {/* Right: Sticky Pricing Panel */}
          <div className="lg:sticky lg:top-8 h-fit">
            <CheckoutSummary payload={payload} />
          </div>
        </div>
      </div>
    </div>
  );
}
