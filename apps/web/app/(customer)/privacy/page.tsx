import Link from 'next/link';
import { InfoPage, InfoSection } from '@/components/layout/info-page';

export const metadata = {
  title: 'Privacy Policy',
  description: 'What data GiftCraft collects, why we collect it, and the control you have over it.',
};

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="What we collect, why we collect it, and what you can do about it. We do not sell your data."
      updated="10 July 2026"
    >
      <InfoSection title="What we collect">
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <span className="font-semibold text-ink">Account</span> — your name, email address, and
            profile picture, provided by Google when you sign in.
          </li>
          <li>
            <span className="font-semibold text-ink">Company &amp; billing</span> — company name,
            GSTIN, PAN, billing and delivery addresses, and phone number.
          </li>
          <li>
            <span className="font-semibold text-ink">Orders</span> — the packs you build, artwork you
            upload, and your order and payment history.
          </li>
          <li>
            <span className="font-semibold text-ink">Usage</span> — pages visited and actions taken,
            used to understand and improve the product.
          </li>
        </ul>
        <p>
          We never see or store your card details. Payments are handled entirely by Razorpay.
        </p>
      </InfoSection>

      <InfoSection title="Why we use it">
        <p>
          To price, produce, invoice, and deliver your orders; to send transactional email about
          those orders; to comply with Indian tax law; and to keep the platform secure.
        </p>
        <p>
          Marketing email is separate and optional. You can turn it off any time from{' '}
          <Link href="/dashboard/settings/notifications" className="font-semibold text-em underline">
            notification settings
          </Link>{' '}
          without affecting order emails, which you will always receive.
        </p>
      </InfoSection>

      <InfoSection title="Who we share it with">
        <p>We share only what a provider needs to do its job:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>Razorpay — to process payments.</li>
          <li>Shiprocket and its courier partners — to deliver your order.</li>
          <li>SendGrid — to send your email.</li>
          <li>Vendors — the artwork and quantities needed to produce your gifts.</li>
        </ul>
        <p>We do not sell your personal data, and we do not share it for anyone else&apos;s marketing.</p>
      </InfoSection>

      <InfoSection title="Where it lives">
        <p>
          Data is stored on managed infrastructure in India (Bengaluru region) and encrypted in
          transit. Access is limited to staff who need it to run your order.
        </p>
      </InfoSection>

      <InfoSection title="How long we keep it">
        <p>
          Order, invoice, and tax records are retained for at least 8 years, as Indian tax law
          requires. Other account data is kept while your account is open.
        </p>
      </InfoSection>

      <InfoSection title="Your rights">
        <p>
          You can access, correct, export, or delete your data from{' '}
          <Link href="/dashboard/settings/privacy" className="font-semibold text-em underline">
            privacy settings
          </Link>
          , or by contacting us. Deletion requests are honoured except where we are legally required
          to retain records, such as issued tax invoices.
        </p>
      </InfoSection>

      <InfoSection title="Contact">
        <p>
          Questions about your data? Reach us via{' '}
          <Link href="/contact" className="font-semibold text-em underline">contact</Link>.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
