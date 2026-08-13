import Link from 'next/link';
import type { ReactNode } from 'react';
import { InfoPage, InfoSection } from '@/components/layout/info-page';

export const metadata = {
  title: 'Return, Refund & Cancellation Policy',
  description:
    'GIVOO return, refund and cancellation policy for customised corporate gift orders — inspection windows, claims, cancellation stages and refund timelines.',
};

/** A lettered clause, mirroring the policy document's (a)/(b)/(c) structure. */
function Clause({ letter, label, children }: { letter: string; label?: string; children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="shrink-0 font-semibold text-ink">({letter})</span>
      <span>
        {label && <span className="font-semibold text-ink">{label} </span>}
        {children}
      </span>
    </li>
  );
}

/** Highlighted note block for the document's bolded warnings and "Important" callouts. */
function Note({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border-l-4 border-em bg-canvas p-4 text-sm leading-relaxed">
      {children}
    </div>
  );
}

const SUPPORT = (
  <a href="mailto:support@givoo.in" className="font-semibold text-em underline">
    support@givoo.in
  </a>
);

export default function ReturnsPage() {
  return (
    <InfoPage
      eyebrow="Legal"
      title="Return, Refund & Cancellation Policy"
      intro="This Policy governs all orders placed on the GIVOO platform (givoo.in), operated by Arts Shala, New Delhi. By placing an order on the platform, you acknowledge having read, understood, and agreed to be bound by this Policy in its entirety. GIVOO is a self-serve bulk corporate gifting platform — all products are customised, branded, and/or assembled to order, and this fundamental characteristic shapes every provision below."
      updated="August 2026 · Version 1.0"
    >
      <InfoSection title="1. Inspection and Reporting Window">
        <p>
          Inspect all delivered goods within{' '}
          <span className="font-semibold text-ink">forty-eight (48) hours of receipt</span> at the
          designated delivery address. Any complaint, claim, or discrepancy — including defects,
          shortages, damage, or branding errors — must be reported to GIVOO in writing at {SUPPORT}{' '}
          within this 48-hour window, accompanied by the evidence specified in Section 6.
        </p>
        <Note>
          <span className="font-semibold text-ink">
            Claims raised after the 48-hour inspection window shall be deemed time-barred and GIVOO
            shall have no obligation to entertain, investigate, or honour such claims.
          </span>{' '}
          <span className="italic">
            The only exception is latent defects not discoverable upon reasonable visual
            inspection, for which the reporting window extends to seven (7) calendar days from
            delivery.
          </span>
        </Note>
      </InfoSection>

      <InfoSection title="2. Customised Goods — No Change-of-Mind Returns">
        <p>
          All goods supplied through GIVOO are made to order and customised according to
          specifications provided and approved by you on the GIVOO dashboard. Accordingly:
        </p>
        <ul className="space-y-2">
          <Clause letter="a">
            No refunds, returns, exchanges, or credits shall be issued for change of mind,
            buyer&apos;s remorse, or subjective dissatisfaction with colour, texture, material
            feel, or minor aesthetic variations that are inherent to physical production.
          </Clause>
          <Clause letter="b">
            No refunds, returns, or exchanges shall be issued for errors in specifications,
            measurements, text, colour codes, artwork, or recipient details that were provided or
            approved by you.
          </Clause>
          <Clause letter="c">
            Once you grant final artwork/proof approval on the dashboard and production has
            commenced, the order is non-cancellable and non-refundable, subject only to the
            exceptions in Sections 3 and 4 below.
          </Clause>
        </ul>
      </InfoSection>

      <InfoSection title="3. Branding and Print Errors">
        <p>
          If a delivered item bears branding that materially deviates from the final approved proof
          (wrong logo placement, mirrored/inverted print, incorrect logo file used by GIVOO), notify{' '}
          {SUPPORT} within 48 hours of delivery, providing:
        </p>
        <ul className="space-y-2">
          <Clause letter="a">Order number and item SKU(s) affected.</Clause>
          <Clause letter="b">
            Clear, high-resolution photographs of every affected item showing the branding concern.
          </Clause>
          <Clause letter="c">A copy of or reference to the approved proof for comparison.</Clause>
        </ul>
        <p>
          Upon verification, GIVOO shall, at its sole discretion, either (i) arrange a
          reprint/replacement of the affected items, or (ii) issue a proportional credit against a
          future order. Refunds to the original payment method shall be issued only where
          replacement or credit is commercially impracticable, and solely at GIVOO&apos;s
          discretion.
        </p>
        <Note>
          <span className="font-semibold text-ink">Important:</span> Logos and branding are printed
          only after your explicit final approval on the dashboard. GIVOO is not liable for errors
          that replicate your own approved artwork, including but not limited to typographical
          errors in text, incorrect colour codes, low-resolution source files, or wrong logo
          versions supplied by you.
        </Note>
      </InfoSection>

      <InfoSection title="4. Damage in Transit">
        <p>If goods arrive physically damaged due to shipping or handling during transit, you must:</p>
        <ul className="space-y-2">
          <Clause letter="a">Notify {SUPPORT} within 48 hours of delivery.</Clause>
          <Clause letter="b">
            Provide photographic evidence of the damaged items and the outer packaging (including
            shipping labels).
          </Clause>
          <Clause letter="c">
            Retain all damaged items and original packaging in unaltered condition until the claim
            is resolved. Disposal of damaged items or packaging before claim resolution shall void
            the claim.
          </Clause>
        </ul>
        <p>
          GIVOO will coordinate with the logistics partner to investigate the claim. Where the
          claim is validated, GIVOO shall either replace the damaged items or issue a proportional
          credit. Cash refunds for transit damage are at GIVOO&apos;s sole discretion and subject
          to recovery from the logistics partner&apos;s insurance.
        </p>
        <p>
          This provision applies to shipments covered under standard transit insurance. For
          uninsured or self-collected shipments, risk passes to you upon handover to your
          designated carrier or collection agent.
        </p>
      </InfoSection>

      <InfoSection title="5. Missing Items and Shortages">
        <p>
          Verify that all items listed on the packing slip/delivery challan have been received. If
          items are missing from any pack or shipment, notify {SUPPORT} within 48 hours of delivery
          with the following:
        </p>
        <ul className="space-y-2">
          <Clause letter="a">
            Order number, packing slip reference, and details of missing item(s).
          </Clause>
          <Clause letter="b">Photographs of items received and packaging.</Clause>
        </ul>
        <p>
          Upon verification against despatch records and weight logs, GIVOO shall either ship the
          missing items at no additional cost or issue a credit/refund for the value of the missing
          items. Discrepancies not reported within the 48-hour window shall be presumed to have
          been received in full.
        </p>
      </InfoSection>

      <InfoSection title="6. Evidence Requirements">
        <p>
          All claims under Sections 3, 4, and 5 must be submitted in writing to {SUPPORT} and must
          include, at minimum:
        </p>
        <ul className="space-y-2">
          <Clause letter="a">Order number and date of delivery.</Clause>
          <Clause letter="b">
            Clear, well-lit photographs of the affected item(s) — minimum three images per item
            (front, back, close-up of defect/issue).
          </Clause>
          <Clause letter="c">
            Photographs of outer packaging and shipping label (for transit damage claims).
          </Clause>
          <Clause letter="d">A brief written description of the issue.</Clause>
        </ul>
        <Note>
          <span className="font-semibold text-ink">
            GIVOO reserves the right to reject claims that are submitted without adequate
            photographic evidence, or where the evidence is inconclusive, altered, or does not
            correspond to the order in question.
          </span>
        </Note>
        <p>
          You can also raise a claim directly from{' '}
          <Link href="/dashboard/disputes/new" className="font-semibold text-em underline">
            your dashboard
          </Link>
          .
        </p>
      </InfoSection>

      <InfoSection title="7. Order Cancellation">
        <p>Cancellation terms depend on the stage of order processing:</p>
        <ul className="space-y-2">
          <Clause letter="a" label="Before production commencement:">
            You may cancel the order with no cancellation charges, provided written notice is sent
            to {SUPPORT} before GIVOO confirms production commencement on the dashboard.
          </Clause>
          <Clause letter="b" label="After raw material procurement but before customisation:">
            Cancellation charge of the cost of materials procured plus 20% handling and restocking
            fee.
          </Clause>
          <Clause letter="c" label="After customisation/branding has commenced or been completed:">
            The full order value is payable. No cancellation, no refund. Customised goods cannot be
            repurposed or resold.
          </Clause>
          <Clause letter="d" label="Post-despatch:">
            Orders that have been despatched cannot be cancelled. You must accept delivery and may
            raise claims only under the applicable sections of this Policy.
          </Clause>
        </ul>
      </InfoSection>

      <InfoSection title="8. Refund Mechanism and Timelines">
        <p>Where a refund is approved under this Policy:</p>
        <ul className="space-y-2">
          <Clause letter="a">
            Refunds shall be processed within{' '}
            <span className="font-semibold text-ink">fifteen (15) business days</span> of claim
            approval.
          </Clause>
          <Clause letter="b">
            Refunds shall be credited to the original payment method used for the order, unless you
            agree in writing to accept store credit.
          </Clause>
          <Clause letter="c">
            Payment gateway charges, transaction/processing fees, and any applicable convenience
            fees are non-refundable under all circumstances.
          </Clause>
          <Clause letter="d">
            Shipping and handling charges are non-refundable unless the error is solely
            attributable to GIVOO.
          </Clause>
          <Clause letter="e">
            Store credits issued under this Policy shall be valid for twelve (12) months from the
            date of issuance and are non-transferable and non-encashable.
          </Clause>
        </ul>
      </InfoSection>

      <InfoSection title="9. Delivery Timelines">
        <p>
          GIVOO&apos;s standard estimated delivery timeline is{' '}
          <span className="font-semibold text-ink">12–14 working days</span> from the date of final
          artwork approval and payment confirmation, whichever is later. Timelines may vary based
          on order complexity, customisation requirements, vendor lead times, and logistics
          conditions, and shall be confirmed at the time of order confirmation on the dashboard.
        </p>
        <p>
          Delays beyond the confirmed delivery date attributable solely to GIVOO entitle you to a
          written update within two (2) business days of the original delivery date. However,
          delays do not entitle you to cancel a customised order or claim a refund unless the delay
          exceeds <span className="font-semibold text-ink">thirty (30) calendar days</span> from
          the confirmed delivery date — in which case you may request cancellation and a full
          refund (less any non-recoverable material costs already incurred).
        </p>
        <p>
          All delivery timelines remain subject to force majeure events, regulatory actions, or
          circumstances beyond GIVOO&apos;s reasonable control.
        </p>
      </InfoSection>

      <InfoSection title="10. Undelivered Shipments">
        <ul className="space-y-2">
          <Clause letter="a" label="Error by GIVOO:">
            If a shipment is undelivered due to an error solely attributable to GIVOO (e.g.,
            incorrect address entered by GIVOO), GIVOO shall reship the items at no additional cost
            or issue a full credit.
          </Clause>
          <Clause letter="b" label="Error by Client:">
            If delivery fails due to incorrect, incomplete, or outdated address information
            provided by you, or due to recipient unavailability or refusal, GIVOO bears no
            liability. Reshipment, if feasible, shall be at your cost.
          </Clause>
          <Clause letter="c" label="Lost in transit:">
            For shipments lost in transit (not marked as delivered or signed for by the carrier),
            GIVOO shall file a claim with the logistics partner and, subject to claim outcome,
            either reship the items or issue a proportional credit. Shipments marked as
            &quot;delivered&quot; or &quot;signed for&quot; by the carrier&apos;s tracking system
            are not considered lost in transit.
          </Clause>
          <Clause letter="d" label="Return to Origin (RTO):">
            If a shipment is returned to origin due to the recipient&apos;s non-availability after
            multiple delivery attempts, you shall bear the cost of re-despatch. Items held in RTO
            for more than thirty (30) days without instructions shall be disposed of at
            GIVOO&apos;s discretion with no refund or credit.
          </Clause>
        </ul>
      </InfoSection>

      <InfoSection title="11. Client Responsibility">
        <p>You are solely responsible for:</p>
        <ul className="space-y-2">
          <Clause letter="a">
            Accuracy and completeness of all customisation details — measurements, colours, Pantone
            codes, text content, designs, logo files, and product specifications — submitted and
            approved on the GIVOO dashboard.
          </Clause>
          <Clause letter="b">Accuracy of all delivery addresses and recipient contact details.</Clause>
          <Clause letter="c">
            Ensuring that artwork, logos, and designs provided do not infringe upon any third-party
            intellectual property rights.
          </Clause>
          <Clause letter="d">
            Reviewing and approving digital proofs/mockups before granting final approval. Final
            approval constitutes acceptance of the design as production-ready.
          </Clause>
        </ul>
        <p>
          GIVOO shall not be liable for any loss, cost, or claim arising from incorrect,
          incomplete, or infringing information provided by you.
        </p>
      </InfoSection>

      <InfoSection title="12. Quality Tolerance and Acceptable Variations">
        <p>
          Due to the nature of physical production and customisation, minor variations are inherent
          and do not constitute defects. These include but are not limited to:
        </p>
        <ul className="space-y-2">
          <Clause letter="a">
            Colour variations of up to 10% between digital proofs and final printed/embroidered
            output, attributable to screen calibration, substrate material, and print/embroidery
            process limitations.
          </Clause>
          <Clause letter="b">Minor variations in texture, weight, or finish across batches.</Clause>
          <Clause letter="c">Thread colour approximations in embroidery.</Clause>
          <Clause letter="d">Placement variations of up to 5&nbsp;mm from the approved proof.</Clause>
          <Clause letter="e">
            A defect rate of up to 2% of total order quantity is considered within acceptable
            manufacturing tolerance. Claims shall be entertained only for defects exceeding this
            threshold.
          </Clause>
        </ul>
        <p>GIVOO shall not entertain claims based solely on such variations.</p>
      </InfoSection>

      <InfoSection title="13. Limitation of Liability">
        <p>
          GIVOO&apos;s total aggregate liability arising out of or in connection with any order
          shall not exceed the invoiced value of the specific items giving rise to the claim,
          excluding taxes, shipping, and transaction fees.
        </p>
        <p>
          In no event shall GIVOO be liable for any indirect, incidental, consequential, special,
          or punitive damages, including but not limited to loss of business, loss of goodwill,
          loss of opportunity, or reputational harm, arising from or related to any order,
          delivery, or this Policy.
        </p>
      </InfoSection>

      <InfoSection title="14. Dispute Resolution">
        <p>
          Any dispute arising from this Policy or any order placed on the platform shall first be
          attempted to be resolved through good-faith negotiation by contacting {SUPPORT}.
        </p>
        <p>
          If the dispute is not resolved within thirty (30) days, it shall be referred to
          arbitration in accordance with the Arbitration and Conciliation Act, 1996 (as amended).
          The seat of arbitration shall be New Delhi, India, and proceedings shall be conducted in
          English. The courts of New Delhi shall have exclusive jurisdiction over matters not
          subject to arbitration.
        </p>
      </InfoSection>

      <InfoSection title="15. Governing Law">
        <p>
          This Policy shall be governed by and construed in accordance with the laws of India.
        </p>
      </InfoSection>

      <InfoSection title="16. Amendments">
        <p>
          GIVOO reserves the right to amend, modify, or update this Policy at any time. The updated
          Policy shall be published on givoo.in and shall take effect immediately upon publication.
          Continued use of the platform after publication of an amended Policy constitutes
          acceptance of the revised terms.
        </p>
        <p>
          You are encouraged to review this Policy periodically. The &quot;Effective Date&quot; and
          &quot;Version&quot; at the top of this page indicate the most recent revision.
        </p>
      </InfoSection>

      {/* Closing block, mirroring the document's "Questions or Claims?" footer */}
      <section className="rounded-md border-2 border-bdr bg-white p-6 text-center md:p-8">
        <h2 className="text-xl font-bold tracking-tight text-ink">Questions or Claims?</h2>
        <div className="mt-3 space-y-1 text-sm leading-relaxed text-ink-2">
          <p>Email: {SUPPORT}</p>
          <p>
            Platform:{' '}
            <Link href="/" className="font-semibold text-em underline">
              givoo.in
            </Link>
          </p>
          <p className="italic">Operated by Arts Shala, New Delhi</p>
        </div>
        <p className="mt-4 text-xs text-ink-3">Policy Version: 1.0 · Last Updated: August 2026</p>
      </section>
    </InfoPage>
  );
}
