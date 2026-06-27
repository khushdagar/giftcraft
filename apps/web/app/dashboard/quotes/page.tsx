import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const revalidate = 60;

export default async function QuotesPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const quotes = await prisma.quote.findMany({
    where: {
      createdById: session.user.id,
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
          <p className="mt-1 text-sm text-ink-2">View and manage your quote requests</p>
        </div>
        <Link href="/builder">
          <Button variant="em">Create New Quote</Button>
        </Link>
      </div>

      {quotes.length === 0 ? (
        <div className="rounded-md border-2 border-bdr bg-gray-50 p-12 text-center">
          <p className="text-ink-2">No quotes yet. Start building a gift pack to create one!</p>
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
