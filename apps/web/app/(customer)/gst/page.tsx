import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage, InfoSection } from '@/components/layout/info-page';
import { withPageSeo } from '@/lib/page-seo';

export function generateMetadata(): Promise<Metadata> {
  return withPageSeo('/gst', baseMetadata);
}

const baseMetadata: Metadata = {
  title: 'GST Information',
  description: 'How GST is calculated and invoiced on GIVOO orders — HSN codes, CGST/SGST, IGST.',
};

const SELLER_GSTIN = process.env.SELLER_GSTIN ?? '07XXXXXXXXX1Z5';

export default function GstPage() {
  return (
    <InfoPage
      eyebrow="Legal"
      title="GST Information"
      intro="Every GIVOO order is invoiced under Indian GST law. Here is exactly how the tax on your order is worked out."
    >
      <InfoSection title="Seller details">
        <p>
          Goods are supplied by <span className="font-semibold text-ink">Arts Shala</span>, New
          Delhi.
        </p>
        <p>
          GSTIN: <span className="font-semibold text-ink">{SELLER_GSTIN}</span> · Place of supply:
          Delhi (state code 07)
        </p>
      </InfoSection>

      <InfoSection title="CGST + SGST, or IGST?">
        <p>
          It depends on where your goods are delivered, because we supply from Delhi:
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <span className="font-semibold text-ink">Delivering within Delhi</span> — the tax splits
            evenly into CGST and SGST.
          </li>
          <li>
            <span className="font-semibold text-ink">Delivering to any other state</span> — the same
            total is charged as a single IGST line.
          </li>
        </ul>
        <p>The total tax is identical either way; only the split on the invoice changes.</p>
      </InfoSection>

      <InfoSection title="Rates are per product, not per order">
        <p>
          GST is not a flat rate across your pack. Each product carries its own HSN code and the rate
          prescribed for it, so a notebook and a power bank in the same pack are taxed at different
          rates. Your invoice lists every item with its HSN code, taxable value, rate, and tax
          amount.
        </p>
        <p>Packaging and add-ons are taxed at 18% under HSN 4819.</p>
      </InfoSection>

      <InfoSection title="Shipping (HSN 996812)">
        <p>
          The courier rate we quote already includes 18% GST. We do not add tax on top of it. Instead
          the invoice reverse-calculates and discloses the tax already inside that amount:
        </p>
        <div className="rounded-md border border-bdr bg-canvas p-4 font-mono text-xs text-ink">
          <p>taxable value = shipping ÷ 1.18</p>
          <p>GST = taxable value × 0.18</p>
          <p>taxable value + GST = the shipping charge you pay</p>
        </div>
        <p>You are never charged twice for tax on shipping.</p>
      </InfoSection>

      <InfoSection title="Payment gateway fee">
        <p>
          The 2% gateway fee carries its own 18% GST, which is levied by the payment gateway. Both
          are shown as a single &quot;Payment Gateway Fee&quot; line, separate from your goods.
        </p>
      </InfoSection>

      <InfoSection title="Input tax credit">
        <p>
          Add your company&apos;s GSTIN at checkout and it will be printed on your invoice so you can
          claim input tax credit. Without a GSTIN the order is invoiced as B2C (unregistered).
        </p>
        <p>
          A proforma invoice is issued when you place your order; a GST tax invoice is issued once
          the order is paid in full. Both can be downloaded from{' '}
          <Link href="/dashboard/orders" className="font-semibold text-em underline">your orders</Link>.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
