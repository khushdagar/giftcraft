import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage, InfoSection } from '@/components/layout/info-page';
import { withPageSeo } from '@/lib/page-seo';

export function generateMetadata(): Promise<Metadata> {
  return withPageSeo('/terms', baseMetadata);
}

const baseMetadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms governing your use of GIVOO and any order you place through it.',
};

export default function TermsPage() {
  return (
    <InfoPage
      eyebrow="Legal"
      title="Terms of Service"
      intro="These terms govern your use of GIVOO and any order you place through it. By placing an order you accept them."
      updated="10 July 2026"
    >
      <InfoSection title="Who we are">
        <p>
          GIVOO is operated by Arts Shala, New Delhi, India. &quot;We&quot; and &quot;us&quot;
          refer to Arts Shala; &quot;you&quot; refers to the person or company placing an order.
        </p>
      </InfoSection>

      <InfoSection title="Quotes and pricing">
        <p>
          Prices shown in the builder are live and depend on your quantity tier. A quote is an offer,
          not a reservation — prices may change until an order is confirmed.
        </p>
        <p>
          Paying a 10% advance locks the quoted prices for 30 days from the date of that payment. If
          the balance is not paid within that window, prices may be re-quoted.
        </p>
        <p>
          Standard branding is included in product prices. GST and the payment gateway fee are shown
          as separate lines and are payable in addition to the item subtotal.
        </p>
      </InfoSection>

      <InfoSection title="Artwork and approval">
        <p>
          You warrant that you own, or are licensed to use, every logo and asset you upload, and that
          printing it does not infringe anyone&apos;s rights. You indemnify us against claims arising
          from artwork you supply.
        </p>
        <p>
          We will produce a mockup for your approval before production. Approving the mockup confirms
          the placement, colour, and spelling shown in it. We are not liable for errors present in an
          approved mockup.
        </p>
        <p>
          Printed colours may vary slightly from what you see on screen, and across different
          materials and printing techniques.
        </p>
      </InfoSection>

      <InfoSection title="Orders, cancellation and delivery">
        <p>
          Minimum order quantities apply and are enforced when entering the Gift Builder. An order
          may be cancelled free of charge before production commences; after materials have been
          procured, cancellation charges apply, and once customisation or branding has begun the
          order can no longer be cancelled.
        </p>
        <p>
          Delivery dates are good-faith estimates, not guarantees. See{' '}
          <Link href="/shipping" className="font-semibold text-em underline">shipping</Link> and{' '}
          <Link href="/returns" className="font-semibold text-em underline">returns</Link>.
        </p>
      </InfoSection>

      <InfoSection title="Payment">
        <p>
          Payments are processed by Razorpay. We do not store your card details. Title to the goods
          passes to you on receipt of payment in full.
        </p>
      </InfoSection>

      <InfoSection title="Liability">
        <p>
          To the extent permitted by law, our total liability for any order is limited to the amount
          you paid for that order. We are not liable for indirect or consequential loss, including
          loss of profit or of business opportunity.
        </p>
      </InfoSection>

      <InfoSection title="Governing law">
        <p>
          These terms are governed by the laws of India, and the courts at New Delhi have exclusive
          jurisdiction over any dispute arising from them.
        </p>
      </InfoSection>

      <InfoSection title="Changes and contact">
        <p>
          We may update these terms; the version in force is the one published here on the date you
          place your order. Questions? Use{' '}
          <Link href="/contact" className="font-semibold text-em underline">contact</Link>.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
