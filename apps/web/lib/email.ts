import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';

const resend = new Resend(process.env.RESEND_API_KEY || '');

// RESEND_FROM_EMAIL must be an address on a domain you've verified in Resend.
// Falls back to the legacy SendGrid vars for a smooth migration.
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || 'orders@giftcraft.in';
const FROM_NAME =
  process.env.RESEND_FROM_NAME || process.env.SENDGRID_FROM_NAME || 'GiftCraft';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Categories map to the toggles in NotificationPreference.prefsJson. Passing a
// category makes a send honour the recipient's opt-out; omitting it (e.g. mail
// to internal admins) always sends.
export type EmailCategory = 'orderStatus' | 'quotes' | 'disputes' | 'marketing';

export interface EmailAttachment {
  filename: string;
  content: Buffer | string; // Buffer or base64 string
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  /** When set, the recipient's notification preferences are checked first. */
  category?: EmailCategory;
  attachments?: EmailAttachment[];
}

/**
 * Decide whether an email may be sent to `to` for a given category, based on the
 * recipient's saved NotificationPreference. Transactional categories default to
 * SEND when the user has no saved prefs; marketing defaults to NOT send (opt-in
 * only — DPDP/consent compliant).
 */
async function isAllowed(to: string, category?: EmailCategory): Promise<boolean> {
  if (!category) return true; // uncategorised (e.g. admin alerts) — always send

  try {
    const user = await prisma.user.findUnique({
      where: { email: to },
      select: { notificationPref: { select: { prefsJson: true } } },
    });

    const prefs = user?.notificationPref?.prefsJson as Record<string, any> | undefined;

    // No user record or no saved prefs: opt-in required for marketing only.
    if (!prefs) return category !== 'marketing';

    if (prefs.email === false) return false;          // master email toggle off
    if (prefs[category] === false) return false;      // this category opted out
    return true;
  } catch (error) {
    // Never let a preference lookup failure swallow a transactional email.
    console.error('Notification preference lookup failed:', error);
    return category !== 'marketing';
  }
}

async function sendEmail(options: EmailOptions) {
  if (!(await isAllowed(options.to, options.category))) {
    return { success: false, skipped: true as const };
  }

  try {
    // Resend returns { data, error } rather than throwing on API-level failures,
    // so check both the returned error and any thrown transport error.
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      ...(options.attachments?.length ? { attachments: options.attachments } : {}),
    });
    if (error) {
      console.error('Resend error:', error);
      return { success: false, error };
    }
    return { success: true };
  } catch (error) {
    console.error('Resend error:', error);
    return { success: false, error };
  }
}

/**
 * Generic sender for ad-hoc / automation-driven emails. Exposed so the
 * automation engine (lib/automation.ts) can dispatch the `send_email` action
 * through the same Resend pipeline and preference checks.
 */
export async function sendCustomEmail(options: {
  to: string;
  subject: string;
  html: string;
  category?: EmailCategory;
  attachments?: EmailAttachment[];
}) {
  return sendEmail(options);
}

// ═══════════════════════════════════════════════════════════════════════════
//   BRANDED EMAIL TEMPLATE SYSTEM
//   Table-based + inline styles for max email-client compatibility
//   (Gmail, Outlook, Apple Mail). Brand palette from CLAUDE.md.
// ═══════════════════════════════════════════════════════════════════════════

const COLORS = {
  navy: '#1A3C6E',
  ink: '#1A1A1A',
  body: '#3F3F46',
  muted: '#71717A',
  faint: '#A1A1AA',
  border: '#E4E4E7',
  surface: '#FAFAFA',
  page: '#F4F4F5',
  orange: '#F97316',
  emerald: '#10B981',
  amber: '#F59E0B',
};

const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;

const inr = (n: number) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const esc = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/** A paragraph styled for email body copy. */
function p(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${COLORS.body};">${text}</p>`;
}

/** Bulletproof CTA button. */
function button(label: string, url: string, color: string = COLORS.orange): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;">
    <tr><td align="center" style="border-radius:12px;background-color:${color};">
      <a href="${url}" target="_blank" style="display:inline-block;padding:14px 30px;font-family:${FONT};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">${label}</a>
    </td></tr>
  </table>`;
}

/** Coloured status pill. */
function badge(text: string, fg: string = COLORS.navy, bg: string = '#E0E7FF'): string {
  return `<span style="display:inline-block;padding:5px 14px;border-radius:999px;background-color:${bg};color:${fg};font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">${esc(text)}</span>`;
}

/** A row inside a summary card. */
function row(label: string, value: string, bold = false): string {
  return `<tr>
    <td style="padding:7px 0;font-size:14px;color:${COLORS.muted};">${esc(label)}</td>
    <td style="padding:7px 0;font-size:14px;text-align:right;color:${COLORS.ink};${bold ? 'font-weight:700;' : ''}">${value}</td>
  </tr>`;
}

/** Wrap summary rows in a light card. */
function card(rowsHtml: string): string {
  return `<div style="background-color:${COLORS.surface};border:1px solid ${COLORS.border};border-radius:12px;padding:6px 20px;margin:4px 0 20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rowsHtml}</table>
  </div>`;
}

/** A highlighted note / callout block. */
function note(html: string): string {
  return `<div style="background-color:#FFFBEB;border-left:3px solid ${COLORS.amber};border-radius:8px;padding:12px 16px;margin:0 0 20px;">
    <p style="margin:0;font-size:14px;line-height:1.55;color:#92400E;">${html}</p>
  </div>`;
}

export interface PriceBreakdown {
  subtotal: number;
  packaging: number;
  addons: number;
  shipping: number;
  cgst: number;
  sgst: number;
  igst: number;
  razorpayFee: number;
  grandTotal: number;
}

/**
 * Render the full price breakdown — identical line items and ordering to the
 * checkout confirmation ("thank you") page so the email matches what the
 * customer saw on screen.
 */
function priceBreakdownCard(
  amounts: PriceBreakdown,
  packQuantity: number,
  opts?: { advancePaid?: number; balanceDue?: number; paymentId?: string }
): string {
  // "Subtotal" on the confirmation page bundles items + packaging + add-ons.
  const itemsSubtotal = amounts.subtotal + amounts.packaging + amounts.addons;
  const gst = amounts.cgst + amounts.sgst + amounts.igst;
  const perPack = packQuantity > 0 ? amounts.grandTotal / packQuantity : 0;

  let rows = '';
  if (amounts.packaging > 0) rows += row('Packaging', inr(amounts.packaging));
  if (amounts.addons > 0) rows += row('Add-ons', inr(amounts.addons));
  rows += row('Subtotal (before shipping, GST)', inr(itemsSubtotal), true);
  // The courier rate is GST-inclusive and `gst` already carries the tax hidden
  // inside it, so list shipping at its taxable value (amount ÷ 1.18) — showing
  // the inclusive amount would count the same rupees twice down the column.
  const shippingTaxable = Math.round((amounts.shipping / 1.18) * 100) / 100;
  rows += row('Shipping (HSN 996812)', amounts.shipping > 0 ? inr(shippingTaxable) : 'FREE');
  if (gst > 0) rows += row('GST', inr(gst));
  if (amounts.razorpayFee > 0)
    rows += row('Payment Processing Fee (Razorpay 2% + 18% GST)', inr(amounts.razorpayFee));

  // Divider before the grand total.
  rows += `<tr><td colspan="2" style="padding:0;"><div style="border-top:2px solid ${COLORS.border};margin:8px 0 2px;"></div></td></tr>`;
  rows += row('Grand Total', `<span style="font-size:16px;">${inr(amounts.grandTotal)}</span>`, true);

  if (opts?.advancePaid != null && opts.advancePaid > 0) {
    rows += `<tr><td colspan="2" style="padding:0;"><div style="border-top:1px solid ${COLORS.border};margin:8px 0 2px;"></div></td></tr>`;
    rows += `<tr><td style="padding:7px 0;font-size:14px;color:${COLORS.emerald};font-weight:600;">Advance Paid (10%)</td><td style="padding:7px 0;font-size:14px;text-align:right;color:${COLORS.emerald};font-weight:700;">${inr(opts.advancePaid)}</td></tr>`;
    if (opts.balanceDue != null && opts.balanceDue > 0)
      rows += row('Balance Due (after mockup approval)', inr(opts.balanceDue), true);
  }
  if (opts?.paymentId)
    rows += row('Payment ID', `<span style="font-family:monospace;font-size:12px;">${esc(opts.paymentId)}</span>`);

  const perPackLine = `<p style="margin:-10px 0 20px;text-align:right;font-size:12px;font-style:italic;font-weight:700;color:${COLORS.emerald};">${inr(perPack)} per gift pack</p>`;

  return card(rows) + perPackLine;
}

/**
 * The master email shell. Every email is rendered through this so headers,
 * footers, spacing and brand styling stay consistent.
 */
function renderEmail(opts: {
  heading: string;
  contentHtml: string;
  preheader?: string;
  footerNote?: string;
}): string {
  const { heading, contentHtml, preheader = '', footerNote = '' } = opts;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${esc(heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.page};-webkit-font-smoothing:antialiased;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(preheader)}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.page};">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${COLORS.border};font-family:${FONT};">
        <!-- Header -->
        <tr><td style="background-color:${COLORS.navy};padding:26px 32px;">
          <span style="font-size:23px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">🎁 GiftCraft</span>
          <span style="display:block;font-size:12px;color:#A9C0E0;margin-top:3px;">Corporate gifting, made effortless</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:34px 32px 28px;">
          <h1 style="margin:0 0 18px;font-size:23px;font-weight:600;color:${COLORS.ink};letter-spacing:-0.3px;line-height:1.3;">${esc(heading)}</h1>
          ${contentHtml}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:22px 32px;background-color:${COLORS.surface};border-top:1px solid ${COLORS.border};">
          ${footerNote ? `<p style="margin:0 0 12px;font-size:12px;line-height:1.5;color:${COLORS.faint};">${footerNote}</p>` : ''}
          <p style="margin:0;font-size:13px;font-weight:700;color:#52525B;">GiftCraft by Arts Shala</p>
          <p style="margin:4px 0 0;font-size:12px;color:${COLORS.faint};">Delhi, India &middot; <a href="${APP_URL}" style="color:${COLORS.navy};text-decoration:none;">giftcraft.in</a></p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:${COLORS.faint};font-family:${FONT};">&copy; GiftCraft &middot; You're receiving this because you have an account or placed an order with us.</p>
    </td></tr>
  </table>
</body>
</html>`;
}

// Status → label / blurb / badge colour, used by the order-status email.
const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  mockup_pending: 'Mockup In Progress',
  mockup_approved: 'Mockup Approved',
  payment_pending: 'Payment Pending',
  production: 'In Production',
  quality_check: 'Quality Check',
  packed: 'Packed',
  shipped: 'Shipped',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

const STATUS_BLURBS: Record<string, string> = {
  confirmed: "We've received your order and our team is getting started.",
  mockup_pending: 'Our design team is preparing your branded mockups.',
  mockup_approved: 'Thanks for approving the mockup!',
  payment_pending: 'Please complete the balance payment to begin production.',
  production: 'Your gifts are now being produced.',
  quality_check: 'Your order is going through quality checks.',
  packed: 'Your order is packed and ready to ship.',
  shipped: 'Your order has been shipped.',
  in_transit: 'Your order is on its way.',
  delivered: 'Your order has been delivered. We hope you love it!',
  completed: 'Your order is complete. Thank you for choosing GiftCraft!',
  cancelled: 'Your order has been cancelled.',
  refunded: 'Your order has been refunded.',
};

const STATUS_BADGE: Record<string, { fg: string; bg: string }> = {
  confirmed: { fg: '#1A3C6E', bg: '#E0E7FF' },
  mockup_pending: { fg: '#5B21B6', bg: '#EDE9FE' },
  mockup_approved: { fg: '#047857', bg: '#D1FAE5' },
  payment_pending: { fg: '#92400E', bg: '#FEF3C7' },
  production: { fg: '#92400E', bg: '#FEF3C7' },
  quality_check: { fg: '#92400E', bg: '#FEF3C7' },
  packed: { fg: '#0369A1', bg: '#E0F2FE' },
  shipped: { fg: '#0369A1', bg: '#E0F2FE' },
  in_transit: { fg: '#0369A1', bg: '#E0F2FE' },
  delivered: { fg: '#047857', bg: '#D1FAE5' },
  completed: { fg: '#047857', bg: '#D1FAE5' },
  cancelled: { fg: '#9F1239', bg: '#FFE4E6' },
  refunded: { fg: '#9F1239', bg: '#FFE4E6' },
};

// ═══════════════════════════════════════════════════════════════════════════
//   EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send artwork approval email to customer
 */
export async function sendArtworkApprovalEmail(
  customerEmail: string,
  customerName: string,
  approvalUrl: string,
  orderId: string
) {
  const content =
    p(`Hi ${esc(customerName)},`) +
    p(`Great news — the branded mockup for your order <strong>${esc(orderId)}</strong> is ready for your review and approval.`) +
    button('Review Your Mockup', approvalUrl, COLORS.emerald) +
    note(`This approval link expires in <strong>72 hours</strong>. Have questions? Just reply to this email.`);

  return sendEmail({
    to: customerEmail,
    subject: `Your GiftCraft Mockup is Ready - Order ${orderId}`,
    html: renderEmail({
      heading: 'Your mockup is ready for approval 🎨',
      preheader: 'Review and approve your branded mockup',
      contentHtml: content,
    }),
    category: 'orderStatus',
  });
}

/**
 * Send revision request received email to admin
 */
export async function sendRevisionReceivedEmail(
  adminEmail: string,
  orderId: string,
  customerName: string,
  revisionNotes: string
) {
  const content =
    p(`Customer <strong>${esc(customerName)}</strong> has requested revisions on order <strong>${esc(orderId)}</strong>.`) +
    `<p style="margin:0 0 8px;font-size:13px;font-weight:700;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.05em;">Revision notes</p>` +
    `<div style="background-color:${COLORS.surface};border:1px solid ${COLORS.border};border-radius:12px;padding:14px 18px;margin:0 0 20px;font-size:14px;line-height:1.6;color:${COLORS.body};">${esc(revisionNotes).replace(/\n/g, '<br/>')}</div>` +
    button('View Order', `${APP_URL}/admin/orders/${orderId}`, COLORS.navy);

  return sendEmail({
    to: adminEmail,
    subject: `Revision Request - Order ${orderId}`,
    html: renderEmail({
      heading: 'Artwork revision requested',
      preheader: `${customerName} requested changes on order ${orderId}`,
      contentHtml: content,
    }),
  });
}

/**
 * Send payment confirmation email after a successful Razorpay payment.
 */
export async function sendPaymentSuccessEmail(options: {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  orderId: string;
  amountPaid: number;
  paymentId: string;
  isAdvance: boolean;
  grandTotal: number;
  // Optional: full price breakdown + invoice attachment (passed at order placement).
  amounts?: PriceBreakdown;
  packQuantity?: number;
  attachments?: EmailAttachment[];
}) {
  const balance = Math.max(0, options.grandTotal - options.amountPaid);
  const orderUrl = `${APP_URL}/dashboard/orders/${options.orderId}`;

  // Prefer the full breakdown (matches the thank-you page); fall back to a short
  // payment summary when the breakdown isn't available (e.g. balance payments).
  const summary =
    options.amounts && options.packQuantity != null
      ? priceBreakdownCard(options.amounts, options.packQuantity, {
          advancePaid: options.amountPaid,
          balanceDue: options.isAdvance ? balance : 0,
          paymentId: options.paymentId,
        })
      : card(
          row('Amount paid', inr(options.amountPaid), true) +
            (options.isAdvance ? row('Balance due (after mockup approval)', inr(balance)) : '') +
            row('Order total', inr(options.grandTotal)) +
            row('Payment ID', `<span style="font-family:monospace;font-size:13px;">${esc(options.paymentId)}</span>`)
        );

  const content =
    p(`Hi ${esc(options.customerName)},`) +
    p(`We've successfully received your ${options.isAdvance ? '10% advance' : 'full'} payment for order <strong>${esc(options.orderNumber)}</strong>.`) +
    summary +
    p('Our design team will now prepare your branded mockups for approval.') +
    (options.attachments?.length
      ? p(`Your proforma invoice is attached to this email as a PDF. 📄`)
      : '') +
    button('View Your Order', orderUrl, COLORS.emerald);

  return sendEmail({
    to: options.customerEmail,
    subject: `Payment Received — Order ${options.orderNumber}`,
    html: renderEmail({
      heading: 'Payment received — thank you! 🎉',
      preheader: `We received ${inr(options.amountPaid)} for order ${options.orderNumber}`,
      contentHtml: content,
    }),
    category: 'orderStatus',
    attachments: options.attachments,
  });
}

/**
 * Send a status-update email to the customer on every order status change.
 */
export async function sendOrderStatusEmail(options: {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  orderId: string;
  status: string;
  note?: string;
}) {
  const label = STATUS_LABELS[options.status] || options.status;
  const blurb = STATUS_BLURBS[options.status] || `Your order status is now: ${label}.`;
  const orderUrl = `${APP_URL}/dashboard/orders/${options.orderId}`;
  const bc = STATUS_BADGE[options.status] || { fg: COLORS.body, bg: COLORS.page };

  const content =
    p(`Hi ${esc(options.customerName)},`) +
    p(blurb) +
    `<p style="margin:0 0 18px;font-size:15px;color:${COLORS.body};">Order <strong>${esc(options.orderNumber)}</strong> is now ${badge(label, bc.fg, bc.bg)}</p>` +
    (options.note ? note(esc(options.note)) : '') +
    button('View Your Order', orderUrl, COLORS.emerald);

  return sendEmail({
    to: options.customerEmail,
    subject: `Order ${options.orderNumber} — ${label}`,
    html: renderEmail({
      heading: `Order update — ${label}`,
      preheader: blurb,
      contentHtml: content,
    }),
    category: 'orderStatus',
  });
}

/**
 * Send the balance payment link after the customer approves the mockup.
 */
export async function sendBalancePaymentLinkEmail(options: {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  orderId: string;
  balanceDue: number;
}) {
  const payUrl = `${APP_URL}/dashboard/orders/${options.orderId}`;

  const content =
    p(`Hi ${esc(options.customerName)},`) +
    p(`Thanks for approving the mockup for order <strong>${esc(options.orderNumber)}</strong>! 🎉`) +
    p(`To start production, please complete the remaining balance of <strong style="color:${COLORS.ink};">${inr(options.balanceDue)}</strong>.`) +
    button(`Pay ${inr(options.balanceDue)} Now`, payUrl, COLORS.amber) +
    `<p style="margin:0;font-size:13px;color:${COLORS.muted};">You can also pay anytime from your order page in the GiftCraft dashboard.</p>`;

  return sendEmail({
    to: options.customerEmail,
    subject: `Action needed: Complete payment for Order ${options.orderNumber}`,
    html: renderEmail({
      heading: 'Mockup approved — complete your payment',
      preheader: `Pay ${inr(options.balanceDue)} to start production`,
      contentHtml: content,
    }),
    category: 'orderStatus',
  });
}

/**
 * Send order shipment notification
 */
export async function sendShipmentNotificationEmail(
  customerEmail: string,
  customerName: string,
  orderId: string,
  trackingUrl?: string
) {
  const content =
    p(`Hi ${esc(customerName)},`) +
    p(`Your GiftCraft order <strong>${esc(orderId)}</strong> has been shipped and is on its way to you.`) +
    (trackingUrl ? button('Track Your Shipment', trackingUrl, COLORS.emerald) : '') +
    p('Thank you for choosing GiftCraft!');

  return sendEmail({
    to: customerEmail,
    subject: `Your Order ${orderId} Has Been Shipped`,
    html: renderEmail({
      heading: 'Your order has shipped! 📦',
      preheader: `Order ${orderId} is on its way`,
      contentHtml: content,
    }),
    category: 'orderStatus',
  });
}

/**
 * Send order shipped with Shiprocket details
 */
export async function sendOrderShippedEmail(options: {
  orderNumber: string;
  companyName: string;
  companyEmail: string;
  awbCode: string;
  courierName: string;
  trackingUrl: string;
}) {
  const summary = card(
    row('AWB code', `<span style="font-family:monospace;font-size:13px;">${esc(options.awbCode)}</span>`, true) +
      row('Courier', esc(options.courierName))
  );

  const content =
    p(`Hi ${esc(options.companyName)},`) +
    p(`Your GiftCraft order <strong>${esc(options.orderNumber)}</strong> has been shipped and is on its way to you.`) +
    summary +
    button('Track Your Shipment', options.trackingUrl, COLORS.emerald) +
    p('Thank you for choosing GiftCraft!');

  return sendEmail({
    to: options.companyEmail,
    subject: `Your Order ${options.orderNumber} Has Been Shipped - AWB ${options.awbCode}`,
    html: renderEmail({
      heading: 'Your order has shipped! 📦',
      preheader: `AWB ${options.awbCode} · ${options.courierName}`,
      contentHtml: content,
    }),
    category: 'orderStatus',
  });
}

/**
 * Send dispute confirmation email to customer
 */
export async function sendDisputeConfirmationEmail(options: {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  disputeId: string;
  subject: string;
}) {
  const summary = card(
    row('Subject', esc(options.subject)) +
      row('Dispute ID', `<span style="font-family:monospace;font-size:13px;">${esc(options.disputeId)}</span>`)
  );

  const content =
    p(`Hi ${esc(options.customerName)},`) +
    p(`Thank you for reporting an issue with order <strong>${esc(options.orderNumber)}</strong>. We've received your dispute and our team will review it shortly.`) +
    summary +
    p('We aim to resolve this within 48 hours of order delivery. You can track the status of your dispute in your GiftCraft dashboard.') +
    `<p style="margin:0;font-size:13px;color:${COLORS.muted};">If you have any questions, just reply to this email.</p>`;

  return sendEmail({
    to: options.customerEmail,
    subject: `Dispute Received - Order ${options.orderNumber}`,
    html: renderEmail({
      heading: "We've received your dispute",
      preheader: `Dispute logged for order ${options.orderNumber}`,
      contentHtml: content,
    }),
    category: 'disputes',
  });
}

/**
 * Send dispute status update email to customer
 */
export async function sendDisputeStatusEmail(options: {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  disputeId: string;
  status: string;
  resolutionNote?: string;
}) {
  const statusText: Record<string, string> = {
    open: 'We are reviewing your dispute.',
    under_review: 'Our team is actively reviewing your dispute.',
    resolved: 'Your dispute has been resolved.',
    closed: 'Your dispute has been closed.',
  };
  const statusBadge: Record<string, { fg: string; bg: string }> = {
    open: { fg: '#92400E', bg: '#FEF3C7' },
    under_review: { fg: '#0369A1', bg: '#E0F2FE' },
    resolved: { fg: '#047857', bg: '#D1FAE5' },
    closed: { fg: '#3F3F46', bg: COLORS.page },
  };
  const bc = statusBadge[options.status] || { fg: COLORS.body, bg: COLORS.page };

  const content =
    p(`Hi ${esc(options.customerName)},`) +
    p(`We have an update on your dispute for order <strong>${esc(options.orderNumber)}</strong>.`) +
    `<p style="margin:0 0 18px;">${badge(options.status.replace('_', ' '), bc.fg, bc.bg)}</p>` +
    p(statusText[options.status] || 'Your dispute status has been updated.') +
    (options.resolutionNote
      ? `<p style="margin:0 0 8px;font-size:13px;font-weight:700;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.05em;">Resolution note</p>` +
        `<div style="background-color:${COLORS.surface};border:1px solid ${COLORS.border};border-radius:12px;padding:14px 18px;margin:0 0 20px;font-size:14px;line-height:1.6;color:${COLORS.body};">${esc(options.resolutionNote)}</div>`
      : '') +
    `<p style="margin:0;font-size:13px;color:${COLORS.muted};">If you have any questions, just reply to this email.</p>`;

  return sendEmail({
    to: options.customerEmail,
    subject: `Dispute Update - Order ${options.orderNumber}`,
    html: renderEmail({
      heading: 'Update on your dispute',
      preheader: statusText[options.status] || 'Your dispute status has been updated',
      contentHtml: content,
    }),
    category: 'disputes',
  });
}

/**
 * Order confirmation email sent when an order is placed. Used on the no-payment
 * "mockup" checkout path (the paid path sends sendPaymentSuccessEmail instead).
 */
export async function sendOrderConfirmationEmail(options: {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  orderId: string;
  packQuantity: number;
  amounts: PriceBreakdown;
  items?: { name: string; unitPrice: number; quantity: number }[];
  attachments?: EmailAttachment[];
}) {
  const orderUrl = `${APP_URL}/dashboard/orders/${options.orderId}`;

  // Items list — name with "unit price × qty", matching the confirmation page.
  const itemsCard = options.items?.length
    ? card(options.items.map((it) => row(esc(it.name), `${inr(it.unitPrice)} × ${it.quantity}`)).join(''))
    : '';

  const content =
    p(`Hi ${esc(options.customerName)},`) +
    p(`We've received your order <strong>${esc(options.orderNumber)}</strong> for ${options.packQuantity} gift packs and our team is getting started. 🎉`) +
    itemsCard +
    priceBreakdownCard(options.amounts, options.packQuantity) +
    p("Our design team will prepare your branded mockups next. We'll email you the moment they're ready for approval.") +
    (options.attachments?.length
      ? p(`Your proforma invoice is attached to this email as a PDF. 📄`)
      : '') +
    button('View Your Order', orderUrl, COLORS.emerald);

  return sendEmail({
    to: options.customerEmail,
    subject: `Order Confirmed — ${options.orderNumber}`,
    html: renderEmail({
      heading: 'Order confirmed — thank you! 🎉',
      preheader: `Order ${options.orderNumber} is confirmed`,
      contentHtml: content,
    }),
    category: 'orderStatus',
    attachments: options.attachments,
  });
}

/**
 * Promotional / offer email sent to customers who opted into marketing.
 * Always passes category 'marketing' so opt-outs are honoured even if the
 * recipient list is built elsewhere.
 */
export async function sendOfferEmail(options: {
  to: string;
  customerName?: string;
  subject: string;
  headline: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
}) {
  const greeting = options.customerName ? `Hi ${esc(options.customerName)},` : 'Hi there,';
  const prefsUrl = `${APP_URL}/dashboard/settings/notifications`;

  const image = options.imageUrl
    ? `<img src="${options.imageUrl}" alt="${esc(options.headline)}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border-radius:12px;margin:0 0 20px;" />`
    : '';

  const bodyHtml = esc(options.body)
    .split(/\n{2,}/)
    .map((para) => p(para.replace(/\n/g, '<br/>')))
    .join('');

  const cta =
    options.ctaLabel && options.ctaUrl ? button(options.ctaLabel, options.ctaUrl, COLORS.orange) : '';

  const content = `<p style="margin:0 0 16px;font-size:15px;color:${COLORS.muted};">${greeting}</p>` + image + bodyHtml + cta;

  return sendEmail({
    to: options.to,
    subject: options.subject,
    html: renderEmail({
      heading: options.headline,
      preheader: options.subject,
      contentHtml: content,
      footerNote: `You're receiving this because you opted in to offers from GiftCraft. <a href="${prefsUrl}" style="color:${COLORS.muted};text-decoration:underline;">Manage your email preferences</a>.`,
    }),
    category: 'marketing',
  });
}
