import Link from 'next/link';
import type { ReactNode } from 'react';
import { InfoPage, InfoSection, InfoQA } from '@/components/layout/info-page';
import { JsonLd } from '@/components/seo/json-ld';
import { faqPageSchema } from '@/lib/schema';

export const metadata = {
  title: 'FAQ',
  description: 'Answers to common questions about ordering branded corporate gifts on GIVOO.',
  alternates: { canonical: '/faq' },
};

// One source of truth for the visible Q&As AND the FAQPage structured data —
// `a` is the plain-text answer (used in JSON-LD), `jsx` an optional richer
// render of the SAME text (links etc.). Keep them saying the same thing.
type Faq = { q: string; a: string; jsx?: ReactNode };

const SECTIONS: Array<{ title: string; faqs: Faq[] }> = [
  {
    title: 'Ordering',
    faqs: [
      {
        q: 'What is the minimum order quantity?',
        a: 'Corporate gift packs start at 25 units and party packs at 10 units. The minimum is checked when you enter the Gift Builder, not while browsing the catalog.',
      },
      {
        q: 'Can different products in a pack have different quantities?',
        a: 'No. A gift pack contains one of each selected product, and a single quantity applies to the whole pack. Change it any time using the units selector in your gift pack summary.',
      },
      {
        q: 'Do I need an account to get a quote?',
        a: 'You can browse, build a pack, and see live pricing without signing in. An account is required to upload your logo and to place an order.',
      },
    ],
  },
  {
    title: 'Pricing',
    faqs: [
      {
        q: 'Is branding charged separately?',
        a: 'No. Standard printing is already included in every product’s price — there is no separate branding line on your quote or invoice.',
      },
      {
        q: 'Why is there a payment processing fee?',
        a: 'Online payments carry a gateway charge of 2% plus GST on that fee. We show it as its own line rather than hiding it inside product prices.',
      },
      {
        q: 'Do prices drop for larger orders?',
        a: 'Yes. Every product has quantity tiers, and your pack is priced at the tier matching your unit count. See the pricing page for the full breakdown.',
        jsx: (
          <p>
            Yes. Every product has quantity tiers, and your pack is priced at the tier matching your
            unit count. See the{' '}
            <Link href="/pricing" className="font-semibold text-em underline">
              pricing page
            </Link>{' '}
            for the full breakdown.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Branding & approval',
    faqs: [
      {
        q: 'What logo formats do you accept?',
        a: 'JPG, PNG, SVG, AI, EPS and PDF, up to 10 MB. Vector files reproduce best.',
      },
      {
        q: 'Do I see the design before production?',
        a: 'Yes. After you place an order we prepare a mockup and send you an approval link. Nothing goes into production until you approve it, and you can request revisions.',
      },
    ],
  },
  {
    title: 'Payment & delivery',
    faqs: [
      {
        q: 'Can I lock prices before paying in full?',
        a: 'Yes. Pay a 10% advance to lock your prices for 30 days. The balance is due after you approve the mockup.',
      },
      {
        q: 'How long does delivery take?',
        a: 'Your estimate combines the longest product lead time, assembly and quality checks, and the courier’s transit time to your pincode. The exact window is shown at the delivery step and again on your order. See shipping for details.',
        jsx: (
          <p>
            Your estimate combines the longest product lead time, assembly and quality checks, and
            the courier&apos;s transit time to your pincode. The exact window is shown at the
            delivery step and again on your order. See{' '}
            <Link href="/shipping" className="font-semibold text-em underline">
              shipping
            </Link>{' '}
            for details.
          </p>
        ),
      },
      {
        q: 'Can you ship to multiple recipients?',
        a: 'Not yet. Every order currently ships as one consolidated delivery to a single address. Individual recipient delivery is coming soon.',
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <>
      <JsonLd
        data={faqPageSchema(
          SECTIONS.flatMap((s) => s.faqs.map((f) => ({ question: f.q, answer: f.a })))
        )}
      />
      <InfoPage
        eyebrow="Help"
        title="Frequently Asked Questions"
        intro="Everything you need to know about building a pack, pricing, branding, and delivery. Can't find your answer? Reach out and we'll help."
      >
        {SECTIONS.map((section) => (
          <InfoSection key={section.title} title={section.title}>
            {section.faqs.map((faq) => (
              <InfoQA key={faq.q} q={faq.q}>
                {faq.jsx ?? <p>{faq.a}</p>}
              </InfoQA>
            ))}
          </InfoSection>
        ))}
      </InfoPage>
    </>
  );
}
