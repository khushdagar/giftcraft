import { prisma } from '@/lib/prisma';
import { formatRupees } from '@/lib/utils';
import { combinedGst, splitPaymentFee } from '@/lib/pricing-display';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';

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

  const isMulti = packs.length > 1;
  const cheapest = packs.reduce(
    (min, p) => Math.min(min, Number(p.payload?.pricing?.grandTotal) || Infinity),
    Infinity
  );

  return (
    <div className="min-h-screen bg-canvas py-10 px-4">
      <div className="container-gc-w max-w-7xl">
        {/* Header */}
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-normal uppercase tracking-wider text-ink-3">
            Proposal #{proposal.id.slice(0, 8).toUpperCase()}
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-normal text-ink">
            {proposal.recipientName ? `${proposal.recipientName}, your` : 'Your'} gift pack
            {isMulti ? ' options' : ''}
          </h1>
          <p className="mt-2 text-ink-3">
            {isMulti
              ? `${packs.length} curated options, each priced separately. Pick the one that fits — every price below includes GST and the payment fee.`
              : 'A curated pack put together for you. The price below includes GST and the payment fee.'}
            {proposal.companyName ? ` Prepared for ${proposal.companyName}.` : ''}
          </p>
          <p className="mt-2 text-sm text-ink-3">
            Valid until {expiresAt.toLocaleDateString('en-IN')}
          </p>
          {/* One PDF covering every option — comparison slide, then each pack. */}
          <Button asChild variant="outline" size="lg" className="mt-4 rounded-md">
            <a href={`/api/proposals/${params.token}/deck`} download>
              Download full proposal (PDF)
            </a>
          </Button>
        </div>

        {/* Personal note from the account manager */}
        {proposal.message && (
          <div className="mb-8 rounded-md border-2 border-bdr bg-white p-5 max-w-3xl">
            <p className="text-xs font-normal uppercase tracking-wider text-ink-3 mb-2">
              A note from your GIVOO team
            </p>
            <p className="text-sm text-ink-2 whitespace-pre-line leading-relaxed">
              {proposal.message}
            </p>
          </div>
        )}

        {/* Pack options */}
        <div
          className={`grid gap-6 ${
            packs.length === 1
              ? 'max-w-2xl'
              : packs.length === 2
                ? 'sm:grid-cols-2'
                : 'sm:grid-cols-2 xl:grid-cols-3'
          }`}
        >
          {packs.map((pack, index) => {
            const payload = pack.payload || {};
            const pricing = payload.pricing || {};
            const products = payload.products || [];
            const packaging = payload.packaging;
            const addons = payload.addons || [];
            const packQuantity = Number(payload.packQuantity) || 1;
            const grandTotal = Number(pricing.grandTotal) || 0;
            const perPack = packQuantity > 0 ? grandTotal / packQuantity : grandTotal;
            const isCheapest = isMulti && grandTotal === cheapest;

            return (
              <div
                key={pack.id}
                className="flex flex-col rounded-md border-2 border-bdr bg-white overflow-hidden"
              >
                {/* Pack header */}
                <div className="border-b border-bdr p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {isMulti && (
                        <p className="text-xs font-normal uppercase tracking-wider text-ink-3">
                          Option {index + 1}
                        </p>
                      )}
                      <h2 className="mt-1 text-xl font-normal text-ink truncate">{pack.label}</h2>
                    </div>
                    {isCheapest && (
                      <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-normal text-emerald-700">
                        Best value
                      </span>
                    )}
                  </div>
                  {pack.tagline && <p className="mt-2 text-sm text-ink-3">{pack.tagline}</p>}
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-normal tabnum text-ink">
                        {formatRupees(perPack)}
                      </p>
                      <p className="text-xs text-ink-3">per pack, incl. GST</p>
                    </div>
                    <p className="text-sm text-ink-3 tabnum">× {packQuantity} packs</p>
                  </div>
                </div>

                {/* Contents */}
                <div className="p-5 space-y-3 flex-1">
                  <p className="text-xs font-normal uppercase tracking-wider text-ink-3">
                    What's inside ({products.length})
                  </p>
                  <ul className="space-y-2">
                    {products.map((product: any) => (
                      <li key={product.id} className="flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-gray-50">
                          {product.image && (
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-ink">{product.name}</p>
                          {product.brand && (
                            <p className="truncate text-xs text-ink-3">{product.brand}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>

                  {(packaging || addons.length > 0) && (
                    <div className="pt-2 space-y-1 border-t border-bdr">
                      {packaging && (
                        <p className="text-xs text-ink-3">
                          Presented in <span className="text-ink-2">{packaging.name}</span>
                        </p>
                      )}
                      {addons.map((addon: any) => (
                        <p key={addon.id} className="text-xs text-ink-3">
                          + {addon.name}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Price breakdown — separate for every pack */}
                <div className="border-t border-bdr bg-gray-50 p-5 space-y-2">
                  <p className="text-xs font-normal uppercase tracking-wider text-ink-3 mb-1">
                    Price breakdown
                  </p>
                  <div className="flex items-center justify-between text-sm text-ink-2">
                    <span>Subtotal (before shipping, GST)</span>
                    <span className="tabnum">{formatRupees(pricing.itemsSubtotal || 0)}</span>
                  </div>
                  {Number(payload.discount) > 0 && (
                    <div className="flex items-center justify-between text-sm text-emerald-700">
                      <span>Discount</span>
                      <span className="tabnum">−{formatRupees(Number(payload.discount))}</span>
                    </div>
                  )}
                  {/* Shipping at its TAXABLE value — the courier rate is
                      GST-inclusive and that GST is inside the combined GST line. */}
                  <div className="flex items-center justify-between text-sm text-ink-2">
                    <span>Shipping</span>
                    <span className="tabnum">
                      {(pricing.shipping ?? 0) > 0
                        ? `+${formatRupees(pricing.shippingTaxable ?? pricing.shipping)}`
                        : 'At checkout'}
                    </span>
                  </div>
                  {splitPaymentFee(pricing.razorpayFee || 0).base > 0 && (
                    <div className="flex items-center justify-between text-sm text-ink-2">
                      <span>Payment fee (2%)</span>
                      <span className="tabnum">
                        +{formatRupees(splitPaymentFee(pricing.razorpayFee || 0).base)}
                      </span>
                    </div>
                  )}
                  {combinedGst(
                    pricing.cgst || 0,
                    pricing.sgst || 0,
                    pricing.igst || 0,
                    pricing.razorpayFee || 0
                  ) > 0 && (
                    <div className="flex items-center justify-between text-sm text-ink-2">
                      <span>GST</span>
                      <span className="tabnum">
                        +
                        {formatRupees(
                          combinedGst(
                            pricing.cgst || 0,
                            pricing.sgst || 0,
                            pricing.igst || 0,
                            pricing.razorpayFee || 0
                          )
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-bdr pt-3 mt-1">
                    <span className="text-sm text-ink">Total</span>
                    <span className="text-xl font-normal tabnum text-ink">
                      {formatRupees(grandTotal)}
                    </span>
                  </div>

                  <div className="pt-3 space-y-2">
                    <Button asChild variant="em" size="lg" className="w-full rounded-md">
                      <Link href={`/quote/${pack.token}`}>
                        {isMulti ? `Choose ${pack.label}` : 'View & Proceed'}
                      </Link>
                    </Button>
                    <a
                      href={`/api/quotes/${pack.token}/deck`}
                      download
                      className="block text-center text-xs text-ink-3 underline underline-offset-2 hover:text-ink"
                    >
                      Download deck (PDF)
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="mt-8 rounded-md border border-blue-200 bg-blue-50 p-4 max-w-3xl">
          <p className="text-xs text-blue-900 leading-relaxed">
            Shipping is calculated at checkout once you enter the delivery address. Every
            price shown includes GST and the 2% payment-processing fee. Want a pack between
            these options? Reply to the proposal email and we'll adjust it.
          </p>
        </div>
      </div>
    </div>
  );
}
