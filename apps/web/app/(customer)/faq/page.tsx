import Link from 'next/link';
import { InfoPage, InfoSection, InfoQA } from '@/components/layout/info-page';

export const metadata = {
  title: 'FAQ',
  description: 'Answers to common questions about ordering branded corporate gifts on GIVOO.',
};

export default function FaqPage() {
  return (
    <InfoPage
      eyebrow="Help"
      title="Frequently Asked Questions"
      intro="Everything you need to know about building a pack, pricing, branding, and delivery. Can't find your answer? Reach out and we'll help."
    >
      <InfoSection title="Ordering">
        <InfoQA q="What is the minimum order quantity?">
          <p>
            Corporate gift packs start at 25 units and party packs at 10 units. The minimum is
            checked when you enter the Gift Builder, not while browsing the catalog.
          </p>
        </InfoQA>
        <InfoQA q="Can different products in a pack have different quantities?">
          <p>
            No. A gift pack contains one of each selected product, and a single quantity applies to
            the whole pack. Change it any time using the units selector in your gift pack summary.
          </p>
        </InfoQA>
        <InfoQA q="Do I need an account to get a quote?">
          <p>
            You can browse, build a pack, and see live pricing without signing in. An account is
            required to upload your logo and to place an order.
          </p>
        </InfoQA>
      </InfoSection>

      <InfoSection title="Pricing">
        <InfoQA q="Is branding charged separately?">
          <p>
            No. Standard printing is already included in every product&apos;s price — there is no
            separate branding line on your quote or invoice.
          </p>
        </InfoQA>
        <InfoQA q="Why is there a payment processing fee?">
          <p>
            Online payments carry a gateway charge of 2% plus GST on that fee. We show it as its own
            line rather than hiding it inside product prices.
          </p>
        </InfoQA>
        <InfoQA q="Do prices drop for larger orders?">
          <p>
            Yes. Every product has quantity tiers, and your pack is priced at the tier matching your
            unit count. See the <Link href="/pricing" className="font-semibold text-em underline">pricing page</Link> for the
            full breakdown.
          </p>
        </InfoQA>
      </InfoSection>

      <InfoSection title="Branding & approval">
        <InfoQA q="What logo formats do you accept?">
          <p>JPG, PNG, SVG, AI, EPS and PDF, up to 10 MB. Vector files reproduce best.</p>
        </InfoQA>
        <InfoQA q="Do I see the design before production?">
          <p>
            Yes. After you place an order we prepare a mockup and send you an approval link. Nothing
            goes into production until you approve it, and you can request revisions.
          </p>
        </InfoQA>
      </InfoSection>

      <InfoSection title="Payment & delivery">
        <InfoQA q="Can I lock prices before paying in full?">
          <p>
            Yes. Pay a 10% advance to lock your prices for 30 days. The balance is due after you
            approve the mockup.
          </p>
        </InfoQA>
        <InfoQA q="How long does delivery take?">
          <p>
            Your estimate combines the longest product lead time, assembly and quality checks, and
            the courier&apos;s transit time to your pincode. The exact window is shown at the
            delivery step and again on your order. See{' '}
            <Link href="/shipping" className="font-semibold text-em underline">shipping</Link> for details.
          </p>
        </InfoQA>
        <InfoQA q="Can you ship to multiple recipients?">
          <p>
            Not yet. Every order currently ships as one consolidated delivery to a single address.
            Individual recipient delivery is coming soon.
          </p>
        </InfoQA>
      </InfoSection>
    </InfoPage>
  );
}
