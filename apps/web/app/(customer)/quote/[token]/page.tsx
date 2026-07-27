import { prisma } from '@/lib/prisma';
import { formatRupees } from '@/lib/utils';
import { combinedGst, splitPaymentFee } from '@/lib/pricing-display';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export async function generateMetadata({ params }: { params: { token: string } }) {
  const quote = await prisma.quote.findUnique({
    where: { shareToken: params.token },
    select: { id: true, expiresAt: true, payload: true },
  });

  if (!quote) {
    return { title: 'Quote Not Found' };
  }

  const payload = quote.payload as any;
  const productNames = payload.products
    ?.slice(0, 2)
    .map((p: any) => p.name)
    .join(' • ') || 'Gift Pack';

  return {
    title: `GIVOO Quote - ${productNames}`,
    description: `View this curated gift pack quote. Total: ${formatRupees(payload.pricing?.grandTotal || 0)}`,
  };
}

export default async function QuotePage({ params }: { params: { token: string } }) {
  const quote = await prisma.quote.findUnique({
    where: { shareToken: params.token },
    select: {
      id: true,
      payload: true,
      expiresAt: true,
    },
  });

  if (!quote) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-normal text-ink mb-2">Quote Not Found</h1>
          <p className="text-ink-3 mb-6">This quote doesn't exist or has been removed.</p>
          <Button asChild variant="em" size="lg">
            <Link href="/builder">Create Your Own Pack</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isExpired = quote.expiresAt < new Date();

  if (isExpired) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-normal text-ink mb-2">Quote Expired</h1>
          <p className="text-ink-3 mb-2">
            This quote expired on {quote.expiresAt.toLocaleDateString('en-IN')}
          </p>
          <p className="text-sm text-ink-3 mb-6">
            You can still create a new pack with similar items!
          </p>
          <Button asChild variant="em" size="lg">
            <Link href="/builder">Build a New Pack</Link>
          </Button>
        </div>
      </div>
    );
  }

  const payload = quote.payload as any;
  const products = payload.products || [];
  const packaging = payload.packaging;
  const addons = payload.addons || [];
  const shippingZone = payload.shippingZone;
  const pricing = payload.pricing || {};

  return (
    <div className="min-h-screen bg-canvas py-8 px-4">
      <div className="container-gc-w max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-normal text-ink">Quote Preview</h1>
          <p className="text-ink-3 mt-1">Quote #{quote.id.slice(0, 8).toUpperCase()}</p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
          {/* Left: Products & Customizations */}
          <div className="space-y-6">
            {/* Products */}
            <div className="rounded-md border-2 border-bdr bg-white p-5 space-y-3">
              <p className="text-xs font-normal uppercase tracking-wider text-ink-3">Items</p>
              {products.map((product: any) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between pb-2 border-b border-bdr last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-normal text-ink">{product.name}</p>
                    <p className="text-xs text-ink-3">×{product.quantity}</p>
                  </div>
                  <p className="text-sm font-normal tabnum text-ink">
                    {formatRupees(product.sellPrice * product.quantity)}
                  </p>
                </div>
              ))}
            </div>

            {/* Customizations */}
            {(packaging || addons.length > 0) && (
              <div className="rounded-md border-2 border-bdr bg-white p-5 space-y-3">
                <p className="text-xs font-normal uppercase tracking-wider text-ink-3">
                  Customizations
                </p>
                {packaging && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-2">{packaging.name}</span>
                    <span className="font-normal text-ink">
                      +{formatRupees(packaging.price * payload.packQuantity)}
                    </span>
                  </div>
                )}
                {addons.length > 0 && (
                  <div className="space-y-1">
                    {addons.map((addon: any) => (
                      <div key={addon.id} className="flex items-center justify-between text-sm">
                        <span className="text-ink-3">{addon.name}</span>
                        <span className="font-normal text-ink">
                          +{formatRupees(addon.price * payload.packQuantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Shipping */}
            {shippingZone && (
              <div className="rounded-md border-2 border-sky-200 bg-sky-50 p-5">
                <p className="text-xs text-sky-700 font-normal mb-2">
                  {shippingZone.zoneName} · Shipping (incl. GST)
                </p>
                <p className="text-lg font-normal text-sky-900 tabnum">
                  {(pricing.shipping ?? 0) > 0 ? formatRupees(pricing.shipping) : 'FREE'}
                </p>
              </div>
            )}
          </div>

          {/* Right: Pricing Summary */}
          <div className="space-y-4">
            <div className="rounded-md bg-dark text-inv p-5 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Subtotal (before shipping, GST)</span>
                <span className="font-normal tabnum">{formatRupees(pricing.itemsSubtotal || 0)}</span>
              </div>
              {/* Shipping at its TAXABLE value — the courier rate is GST-inclusive
                  and the GST inside it is disclosed in the combined GST line below. */}
              {(pricing.shipping ?? 0) > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span>Shipping (HSN 996812)</span>
                  <span className="font-normal tabnum">
                    +{formatRupees(pricing.shippingTaxable ?? pricing.shipping)}
                  </span>
                </div>
              )}
              {/* Payment fee (2%), pre-GST — its GST is part of the combined GST
                  line below. */}
              {splitPaymentFee(pricing.razorpayFee || 0).base > 0 && (
                <div className="flex items-center justify-between text-sm border-t border-inv/20 pt-2">
                  <span>Payment Fee (2%)</span>
                  <span className="font-normal tabnum">+{formatRupees(splitPaymentFee(pricing.razorpayFee || 0).base)}</span>
                </div>
              )}
              {/* GST — single all-in line: goods + shipping GST + the payment-fee
                  GST, shown last below the payment fee. */}
              {combinedGst(pricing.cgst || 0, pricing.sgst || 0, pricing.igst || 0, pricing.razorpayFee || 0) > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span>GST</span>
                  <span className="font-normal tabnum">
                    +{formatRupees(combinedGst(pricing.cgst || 0, pricing.sgst || 0, pricing.igst || 0, pricing.razorpayFee || 0))}
                  </span>
                </div>
              )}
              <div className="border-t border-inv/20 pt-3 flex items-center justify-between">
                <span className="font-normal">Total</span>
                <span className="text-2xl font-normal tabnum">{formatRupees(pricing.grandTotal || 0)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button
                asChild
                variant="em"
                size="lg"
                className="w-full rounded-md"
              >
                <a href={`/api/quotes/${quote.id.split('_')[0]}/pdf`} download>
                  Download PDF
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full rounded-md"
              >
                <Link href="/builder">Create Similar Pack</Link>
              </Button>
            </div>

            {/* Info */}
            <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
              <p className="text-[10px] font-normal text-blue-900 mb-1">ℹ️ Quote Info</p>
              <p className="text-[10px] text-blue-800 leading-relaxed">
                Valid until {quote.expiresAt.toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
