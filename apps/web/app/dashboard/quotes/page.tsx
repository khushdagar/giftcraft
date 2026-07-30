import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Per-user data — must render per request, never cache across users.
export const dynamic = 'force-dynamic';

export default async function QuotesPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // A quote appears here only once its proposal deck was downloaded — one
  // entry per downloaded pack, NOT one per checkout visit (every "Review
  // Order" click creates a quote row; listing those directly shows dupes).
  // Downloads are matched by user id, plus email so decks grabbed while
  // logged out (via the lead-capture dialog) surface after signing in.
  const downloads = await prisma.proposalDownload.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        ...(session.user.email ? [{ email: session.user.email }] : []),
      ],
    },
    select: { quoteToken: true },
  });
  const downloadedTokens = [...new Set(downloads.map((d) => d.quoteToken))];

  const quotes = await prisma.quote.findMany({
    where: {
      shareToken: { in: downloadedTokens },
      // Own quotes, plus guest-created ones (no owner) reached via their own
      // download record — never another user's quotes.
      OR: [{ createdById: session.user.id }, { createdById: null }],
    },
    include: {
      company: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between border-b border-bdr pb-8">
        <div>
          <h1 className="text-3xl font-normal tracking-tight text-ink">My Quotes</h1>
          <p className="mt-1 text-sm text-ink-2">
            Packs whose proposal deck you&apos;ve downloaded
          </p>
        </div>
        <Link href="/builder">
          <Button variant="em">Create New Quote</Button>
        </Link>
      </div>

      {quotes.length === 0 ? (
        <div className="rounded-md border-2 border-bdr bg-gray-50 p-12 text-center">
          <p className="text-ink-2">
            No saved quotes yet. Build a gift pack and download its proposal
            deck at checkout — it&apos;ll be saved here.
          </p>
          <Link href="/builder" className="mt-4 inline-block">
            <Button variant="em">Start Building</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <div key={quote.id} className="rounded-md border-2 border-bdr p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-normal text-ink">Quote #{quote.id.slice(0, 8)}</h3>
                  <p className="text-sm text-ink-2">{quote.company?.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-normal text-em">₹{Number((quote.payload as any)?.pricing?.grandTotal || 0).toLocaleString()}</p>
                  <p className="text-xs text-ink-3">
                    {new Date(quote.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-sm text-ink-2">Expires: {new Date(quote.expiresAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
