/**
 * Send one preview of every outbound email template to a single address.
 *
 * Usage:
 *   npx tsx scripts/send-email-previews.ts someone@example.com
 *
 * NEXT_PUBLIC_APP_URL is forced to the production origin before lib/email is
 * imported, because the logo and every CTA link are absolute URLs built off it
 * — with the local .env value they'd point at http://localhost:3000 and the
 * wordmark would render as a broken image in the inbox.
 */
import 'dotenv/config';

process.env.NEXT_PUBLIC_APP_URL = process.env.PREVIEW_APP_URL || 'https://givoo.in';

const TO = process.argv[2];
if (!TO) {
  console.error('Usage: tsx scripts/send-email-previews.ts <recipient@example.com>');
  process.exit(1);
}

async function main() {
  const email = await import('../lib/email');
  const { COLORS } = await import('../lib/email-theme');

  const amounts: import('../lib/email').PriceBreakdown = {
    subtotal: 212000,
    packaging: 18000,
    addons: 6000,
    shipping: 4500,
    cgst: 0,
    sgst: 0,
    igst: 43290,
    razorpayFee: 6721,
    grandTotal: 290511,
  };

  // Each entry sends one template with representative sample data.
  const previews: { name: string; run: () => Promise<any> }[] = [
    {
      name: 'Order confirmation (no-payment checkout)',
      run: () =>
        email.sendOrderConfirmationEmail({
          customerEmail: TO,
          customerName: 'Uday',
          orderNumber: 'GVO-2026-0417',
          orderId: 'preview-order-id',
          packQuantity: 120,
          amounts,
          items: [
            { name: 'Ceramic Coffee Mug — Matte Black', unitPrice: 385, quantity: 120 },
            { name: 'Bamboo Notebook A5', unitPrice: 240, quantity: 120 },
            { name: 'Stainless Steel Bottle 750ml', unitPrice: 690, quantity: 120 },
            { name: 'Rigid Gift Box — Medium', unitPrice: 150, quantity: 120 },
          ],
        }),
    },
    {
      name: 'Payment received (10% advance)',
      run: () =>
        email.sendPaymentSuccessEmail({
          customerEmail: TO,
          customerName: 'Uday',
          orderNumber: 'GVO-2026-0417',
          orderId: 'preview-order-id',
          amountPaid: 29051.1,
          paymentId: 'pay_QxLm9ZtR4kPreview',
          isAdvance: true,
          grandTotal: amounts.grandTotal,
          amounts,
        }),
    },
    {
      name: 'Artwork / mockup approval request',
      run: () =>
        email.sendArtworkApprovalEmail(
          TO,
          'Uday',
          'https://givoo.in/approve/preview-token',
          'GVO-2026-0417'
        ),
    },
    {
      name: 'Balance payment link (after mockup approval)',
      run: () =>
        email.sendBalancePaymentLinkEmail({
          customerEmail: TO,
          customerName: 'Uday',
          orderNumber: 'GVO-2026-0417',
          orderId: 'preview-order-id',
          balanceDue: 261459.9,
        }),
    },
    {
      name: 'Order status update (In Production)',
      run: () =>
        email.sendOrderStatusEmail({
          customerEmail: TO,
          customerName: 'Uday',
          orderNumber: 'GVO-2026-0417',
          orderId: 'preview-order-id',
          status: 'production',
          note: 'Printing starts tomorrow. Expected dispatch: 12 August.',
        }),
    },
    {
      name: 'Order status update (Delivered)',
      run: () =>
        email.sendOrderStatusEmail({
          customerEmail: TO,
          customerName: 'Uday',
          orderNumber: 'GVO-2026-0417',
          orderId: 'preview-order-id',
          status: 'delivered',
        }),
    },
    {
      name: 'Shipment notification (basic)',
      run: () =>
        email.sendShipmentNotificationEmail(
          TO,
          'Uday',
          'GVO-2026-0417',
          'https://givoo.in/track/preview'
        ),
    },
    {
      name: 'Order shipped (Shiprocket / AWB)',
      run: () =>
        email.sendOrderShippedEmail({
          orderNumber: 'GVO-2026-0417',
          companyName: 'Acme Technologies',
          companyEmail: TO,
          awbCode: '1234567890123',
          courierName: 'Delhivery Surface',
          trackingUrl: 'https://givoo.in/track/preview',
        }),
    },
    {
      name: 'Dispute received',
      run: () =>
        email.sendDisputeConfirmationEmail({
          customerEmail: TO,
          customerName: 'Uday',
          orderNumber: 'GVO-2026-0417',
          disputeId: 'DSP-00218',
          subject: '4 mugs arrived with chipped rims',
        }),
    },
    {
      name: 'Dispute status update (Resolved)',
      run: () =>
        email.sendDisputeStatusEmail({
          customerEmail: TO,
          customerName: 'Uday',
          orderNumber: 'GVO-2026-0417',
          disputeId: 'DSP-00218',
          status: 'resolved',
          resolutionNote:
            'Replacement mugs dispatched on 2 August via Delhivery. No charge for the replacement or shipping.',
        }),
    },
    {
      name: 'Proposal / quote (admin-created)',
      run: () =>
        email.sendProposalEmail({
          to: TO,
          recipientName: 'Uday',
          companyName: 'Acme Technologies',
          quoteToken: 'preview-quote-token',
          packQuantity: 120,
          productNames: [
            'Ceramic Coffee Mug — Matte Black',
            'Bamboo Notebook A5',
            'Stainless Steel Bottle 750ml',
            'Cotton Tote Bag',
            'Rigid Gift Box — Medium',
          ],
          grandTotal: amounts.grandTotal,
          validUntil: new Date('2026-08-31'),
          message:
            'Hi Uday — here is the Diwali pack we discussed, sized for 120 employees. Happy to swap any item.',
        }),
    },
    {
      name: 'Marketing / offer email',
      run: () =>
        email.sendOfferEmail({
          to: TO,
          customerName: 'Uday',
          subject: 'Diwali corporate gifting — book by 20 August',
          headline: 'Diwali gifting, sorted early',
          body:
            'Diwali orders book out fast, and production slots for October close by the end of August.\n\nBuild your pack now and lock in current pricing. Every pack includes branded printing in the price — no separate branding cost, ever.',
          ctaLabel: 'Build Your Pack',
          ctaUrl: 'https://givoo.in/builder',
          bypassOptOut: true, // preview must deliver regardless of opt-in state
        }),
    },
    {
      name: 'Automation engine email (shared shell)',
      run: () =>
        email.sendCustomEmail({
          to: TO,
          subject: 'Reminder: your mockup is waiting for approval',
          html: email.renderEmail({
            heading: 'Reminder: your mockup is waiting for approval',
            preheader: 'Approve your mockup to start production',
            contentHtml:
              `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${COLORS.body};">Hi Uday, your mockup for order GVO-2026-0417 has been waiting for approval for 3 days.</p>` +
              `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${COLORS.body};">Production can only start once it is approved.</p>` +
              `<p style="margin:24px 0 0;font-size:13px;color:${COLORS.muted};">— The GIVOO Team</p>`,
          }),
        }),
    },
    {
      name: 'Internal: revision requested (admin-facing)',
      run: () =>
        email.sendRevisionReceivedEmail(
          TO,
          'GVO-2026-0417',
          'Uday',
          'Please move the logo 10mm higher on the bottle and use the white version on the dark mug.'
        ),
    },
  ];

  console.log(`Sending ${previews.length} previews to ${TO}\n`);

  let ok = 0;
  for (const [i, preview] of previews.entries()) {
    try {
      const result: any = await preview.run();
      if (result?.success) {
        ok++;
        console.log(`  [${i + 1}/${previews.length}] ✓ ${preview.name}`);
      } else if (result?.skipped) {
        console.log(`  [${i + 1}/${previews.length}] – skipped (opt-out): ${preview.name}`);
      } else {
        console.log(`  [${i + 1}/${previews.length}] ✗ ${preview.name}`, result?.error);
      }
    } catch (err) {
      console.log(`  [${i + 1}/${previews.length}] ✗ ${preview.name}`, err);
    }
    // Resend's default rate limit is 2 requests/second — stay well under it.
    await new Promise((r) => setTimeout(r, 700));
  }

  console.log(`\nDone: ${ok}/${previews.length} sent.`);
  process.exit(0);
}

main();
