import Link from 'next/link';
import { InfoPage, InfoSection } from '@/components/layout/info-page';

export const metadata = {
  title: 'Returns',
  description: 'GiftCraft returns, replacements and refund policy for branded corporate gift orders.',
};

export default function ReturnsPage() {
  return (
    <InfoPage
      eyebrow="Help"
      title="Returns"
      intro="Branded gifts are produced to order, so our policy focuses on getting it right before production and making it right if something arrives damaged or incorrect."
      updated="10 July 2026"
    >
      <InfoSection title="Custom-branded goods">
        <p>
          Because your logo is printed onto each item, packs cannot be resold and are not eligible
          for change-of-mind returns once production has started.
        </p>
        <p>
          This is exactly why we send a mockup for approval before anything is printed. Review it
          carefully — placement, colour, and spelling — and request revisions until you are happy.
          Production begins only after you approve.
        </p>
      </InfoSection>

      <InfoSection title="When we will replace or refund">
        <p>We will replace the affected items, or refund them, if:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>The goods arrive damaged, defective, or short of the ordered quantity.</li>
          <li>The branding does not match the mockup you approved.</li>
          <li>You received a different product from the one you ordered.</li>
        </ul>
        <p>
          Raise the issue within <span className="font-semibold text-ink">7 days of delivery</span>{' '}
          and include photographs of the outer box and the affected items. You can do this from{' '}
          <Link href="/dashboard/disputes/new" className="font-semibold text-em underline">your dashboard</Link>.
        </p>
      </InfoSection>

      <InfoSection title="Cancelling an order">
        <p>
          Before mockup approval, an order can be cancelled and any advance is refunded in full.
          After approval, materials are committed and production has begun, so cancellation is not
          possible.
        </p>
      </InfoSection>

      <InfoSection title="How refunds are issued">
        <p>
          Approved refunds are returned to the original payment method, typically within 5–7 working
          days of approval. Payment gateway fees on the original transaction are non-refundable, as
          they are levied by the gateway rather than by us.
        </p>
      </InfoSection>

      <InfoSection title="Need help?">
        <p>
          Talk to us before raising a formal claim — most issues are resolved faster that way. Reach
          us via <Link href="/contact" className="font-semibold text-em underline">contact</Link>.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
