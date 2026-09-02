import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage, InfoSection } from '@/components/layout/info-page';
import { withPageSeo } from '@/lib/page-seo';

export function generateMetadata(): Promise<Metadata> {
  return withPageSeo('/shipping', baseMetadata);
}

const baseMetadata: Metadata = {
  title: 'Shipping',
  description: 'How GIVOO calculates delivery timelines and courier charges across India.',
};

export default function ShippingPage() {
  return (
    <InfoPage
      eyebrow="Help"
      title="Shipping"
      intro="How we calculate your delivery date and courier charge, and what to expect once your order is placed."
    >
      <InfoSection title="Where we deliver">
        <p>
          We ship anywhere in India. Enter your pincode at the delivery step and we&apos;ll confirm
          serviceability and quote the exact courier rate before you pay.
        </p>
        <p>
          Every order currently ships as one consolidated delivery to a single address. Delivery to
          individual recipients is not available yet.
        </p>
      </InfoSection>

      <InfoSection title="How your delivery date is calculated">
        <p>Your estimated delivery window is the sum of three stages:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <span className="font-semibold text-ink">Production</span> — the longest lead time among
            the products in your pack. Packs move at the speed of their slowest item.
          </li>
          <li>
            <span className="font-semibold text-ink">Assembly &amp; quality check</span> — packing,
            branding checks, and photographs before dispatch.
          </li>
          <li>
            <span className="font-semibold text-ink">Transit</span> — the courier&apos;s own estimate
            for your pincode.
          </li>
        </ul>
        <p>
          Production only begins once you approve your mockup, so approving promptly keeps your
          delivery date on track.
        </p>
      </InfoSection>

      <InfoSection title="Shipping charges">
        <p>
          Courier charges are quoted live from your pincode, the billable weight of your order, and
          the number of packs. Billable weight is the greater of the actual weight and the
          volumetric weight (length × width × height ÷ 5000), which is how couriers bill bulky but
          light shipments.
        </p>
        <p>
          The shipping rate we quote is inclusive of 18% GST (HSN 996812). Your invoice discloses the
          taxable value and the GST contained within it separately — see{' '}
          <Link href="/gst" className="font-semibold text-em underline">GST information</Link>.
        </p>
      </InfoSection>

      <InfoSection title="Tracking your order">
        <p>
          You&apos;ll receive an email at every stage — confirmation, mockup approval, production,
          dispatch, and delivery. You can also follow live progress from your{' '}
          <Link href="/dashboard/orders" className="font-semibold text-em underline">orders dashboard</Link>.
        </p>
      </InfoSection>

      <InfoSection title="Delays">
        <p>
          Estimated dates are estimates, not guarantees. Public holidays, courier disruption, and
          delayed mockup approval can move your date. If a delay affects your delivery we will
          contact you before it becomes a problem — if the gift is for a fixed date, tell us up front
          via <Link href="/contact" className="font-semibold text-em underline">contact</Link> and
          we&apos;ll plan around it.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
