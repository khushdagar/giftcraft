import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { CheckoutSummary } from '@/components/checkout/checkout-summary';

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
