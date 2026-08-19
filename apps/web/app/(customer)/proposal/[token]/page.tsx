import { prisma } from '@/lib/prisma';
import { ProposalView } from '@/components/proposal/proposal-view';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Token-scoped and personalised — never cache one recipient's proposal.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { token: string } }) {
  const proposal = await prisma.proposal.findUnique({
    where: { shareToken: params.token },
    select: { companyName: true },
  });

  if (!proposal) {
    return { title: 'Proposal Not Found', robots: { index: false, follow: false } };
  }

  return {
    title: `GIVOO Proposal${proposal.companyName ? ` — ${proposal.companyName}` : ''}`,
    description: 'Compare your curated gift pack options and pick the one that fits.',
    // Private share-token URL — must never be indexed.
    robots: { index: false, follow: false },
  };
}

/** Full-width message shell, used for the not-found / expired states. */
function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-normal text-ink mb-2">{title}</h1>
        <p className="text-ink-3 mb-6">{body}</p>
        <Button asChild variant="em" size="lg">
          <Link href="/builder">Create Your Own Pack</Link>
        </Button>
      </div>
    </div>
  );
}

export default async function ProposalComparePage({
  params,
}: {
  params: { token: string };
}) {
  const proposal = await prisma.proposal.findUnique({
    where: { shareToken: params.token },
    select: {
      id: true,
      recipientName: true,
      companyName: true,
      message: true,
      createdAt: true,
      quote: { select: { shareToken: true, payload: true, expiresAt: true } },
      packs: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          label: true,
          tagline: true,
          quote: { select: { shareToken: true, payload: true, expiresAt: true } },
        },
      },
    },
  });

  if (!proposal) {
    return (
      <Notice
        title="Proposal Not Found"
        body="This proposal doesn't exist or has been removed."
      />
    );
  }

  // Proposals created before multi-pack existed have no ProposalPack rows —
  // fall back to the single primary quote.
  const packs =
    proposal.packs.length > 0
      ? proposal.packs.map((p) => ({
          id: p.id,
          label: p.label,
          tagline: p.tagline,
          token: p.quote.shareToken,
          payload: p.quote.payload as any,
          expiresAt: p.quote.expiresAt,
        }))
      : [
          {
            id: proposal.id,
            label: 'Your pack',
            tagline: null,
            token: proposal.quote.shareToken,
            payload: proposal.quote.payload as any,
            expiresAt: proposal.quote.expiresAt,
          },
        ];

  const expiresAt = packs[0]?.expiresAt ?? proposal.quote.expiresAt;
  if (expiresAt < new Date()) {
    return (
      <Notice
        title="Proposal Expired"
        body={`This proposal expired on ${expiresAt.toLocaleDateString('en-IN')}. We'd be happy to send you a fresh one.`}
      />
    );
  }

  return (
    <ProposalView
      reference={proposal.id.slice(0, 8).toUpperCase()}
      recipientName={proposal.recipientName}
      companyName={proposal.companyName}
      message={proposal.message}
      expiresAt={expiresAt}
      deckHref={`/api/proposals/${params.token}/deck`}
      packs={packs.map((p) => ({
        id: p.id,
        label: p.label,
        tagline: p.tagline,
        token: p.token,
        payload: p.payload,
      }))}
    />
  );
}
