import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { invoiceLabel } from '@/lib/invoice-status';
import { COLORS, FONT, LOGO_URL, esc } from './email-theme';
import { richTextToEmailHtml } from './email-rich-text';

const resend = new Resend(process.env.RESEND_API_KEY || '');

// RESEND_FROM_EMAIL must be an address on a domain you've verified in Resend.
// Falls back to the legacy SendGrid vars for a smooth migration.
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || 'orders@givoo.in';
const FROM_NAME =
  process.env.RESEND_FROM_NAME || process.env.SENDGRID_FROM_NAME || 'GIVOO';
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

const inr = (n: number) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** A paragraph styled for email body copy. */
function p(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${COLORS.body};">${text}</p>`;
}

/**
 * Bulletproof CTA button. Always brand burgundy — one button style across every
 * email, so nothing introduces a colour the website doesn't use.
 */
function button(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;">
    <tr><td align="center" style="border-radius:8px;background-color:${COLORS.brand};">
      <a href="${url}" target="_blank" style="display:inline-block;padding:13px 28px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
    </td></tr>
  </table>`;
}

/** Status pill. */
function badge(text: string, fg: string = COLORS.brand, bg: string = COLORS.brandTint): string {
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
  return `<div style="background-color:${COLORS.page};border-left:3px solid ${COLORS.brand};border-radius:8px;padding:12px 16px;margin:0 0 20px;">
    <p style="margin:0;font-size:14px;line-height:1.55;color:${COLORS.body};">${html}</p>
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
 * Render the price summary with the same line items the customer saw at
 * checkout: products, packaging, add-ons, shipping, GST, the gateway fee
 * (GST-inclusive, per RULE 2 always its own line), and the grand total —
 * plus, when an advance has been taken, what has been paid against it.
 */
function priceBreakdownCard(
  amounts: PriceBreakdown,
  opts?: { advancePaid?: number; balanceDue?: number; paymentId?: string }
): string {
  // The gateway fee is stored GST-INCLUSIVE and its tax is not part of
  // cgst/sgst/igst, so the GST row here covers products only — mirroring the
  // checkout summary, where "Payment Processing" carries its own 18%.
  const gst = round2(amounts.cgst + amounts.sgst + amounts.igst);

  let rows = row('Subtotal', inr(amounts.subtotal));
  if (amounts.packaging > 0) rows += row('Packaging', inr(amounts.packaging));
  if (amounts.addons > 0) rows += row('Add-ons', inr(amounts.addons));
  if (amounts.shipping > 0) rows += row('Shipping', inr(amounts.shipping));
  if (gst > 0) rows += row('GST', inr(gst));
  if (amounts.razorpayFee > 0)
    rows += row('Payment Processing (Razorpay 2% + 18% GST)', inr(amounts.razorpayFee));

  // Divider before the grand total.
  rows += `<tr><td colspan="2" style="padding:0;"><div style="border-top:2px solid ${COLORS.border};margin:8px 0 2px;"></div></td></tr>`;
  rows += row('Grand Total', `<span style="font-size:16px;">${inr(amounts.grandTotal)}</span>`, true);

  if (opts?.advancePaid != null && opts.advancePaid > 0) {
    rows += `<tr><td colspan="2" style="padding:0;"><div style="border-top:1px solid ${COLORS.border};margin:8px 0 2px;"></div></td></tr>`;
    rows += `<tr><td style="padding:7px 0;font-size:14px;color:${COLORS.brand};font-weight:600;">Advance Paid (10%)</td><td style="padding:7px 0;font-size:14px;text-align:right;color:${COLORS.brand};font-weight:700;">${inr(opts.advancePaid)}</td></tr>`;
    if (opts.balanceDue != null && opts.balanceDue > 0)
      rows += row('Balance Due (after mockup approval)', inr(opts.balanceDue), true);
  }
  if (opts?.paymentId)
    rows += row('Payment ID', `<span style="font-family:monospace;font-size:12px;">${esc(opts.paymentId)}</span>`);

  return card(rows);
}

/**
 * The master email shell. Every email is rendered through this so headers,
 * footers, spacing and brand styling stay consistent.
 */
export function renderEmail(opts: {
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
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${COLORS.border};font-family:${FONT};">
        <!-- Header: the real wordmark on white, with a thin brand rule under it -->
        <tr><td align="center" style="padding:28px 32px 22px;border-bottom:2px solid ${COLORS.brand};">
          <a href="${APP_URL}" target="_blank" style="text-decoration:none;">
            <img src="${LOGO_URL}" alt="GIVOO" width="132" style="display:block;width:132px;max-width:132px;height:auto;border:0;" />
          </a>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px 32px 28px;">
          <h1 style="margin:0 0 18px;font-size:22px;font-weight:700;color:${COLORS.ink};letter-spacing:-0.2px;line-height:1.35;">${esc(heading)}</h1>
          ${contentHtml}
        </td></tr>
        <!-- Footer -->
        <tr><td align="center" style="padding:22px 32px;background-color:${COLORS.surface};border-top:1px solid ${COLORS.border};">
          ${footerNote ? `<p style="margin:0 0 12px;font-size:12px;line-height:1.5;color:${COLORS.muted};">${footerNote}</p>` : ''}
          <p style="margin:0;font-size:13px;font-weight:700;color:${COLORS.ink};">GIVOO</p>
          <p style="margin:4px 0 0;font-size:12px;color:${COLORS.muted};">Delhi, India &middot; <a href="${APP_URL}" style="color:${COLORS.brand};text-decoration:none;">Visit GIVOO</a></p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:${COLORS.muted};font-family:${FONT};">&copy; GIVOO &middot; You're receiving this because you have an account or placed an order with us.</p>
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
  completed: 'Your order is complete. Thank you for choosing GIVOO!',
  cancelled: 'Your order has been cancelled.',
  refunded: 'Your order has been refunded.',
};

// Two tones only — brand burgundy for live orders, neutral ivory for ended
// ones. The site has no separate status palette, so neither does the email.
const BRAND_PILL = { fg: COLORS.brand, bg: COLORS.brandTint };
const NEUTRAL_PILL = { fg: COLORS.body, bg: COLORS.recessed };

const STATUS_BADGE: Record<string, { fg: string; bg: string }> = {
  confirmed: BRAND_PILL,
  mockup_pending: BRAND_PILL,
  mockup_approved: BRAND_PILL,
  payment_pending: BRAND_PILL,
  production: BRAND_PILL,
  quality_check: BRAND_PILL,
  packed: BRAND_PILL,
  shipped: BRAND_PILL,
  in_transit: BRAND_PILL,
  delivered: BRAND_PILL,
  completed: BRAND_PILL,
  cancelled: NEUTRAL_PILL,
  refunded: NEUTRAL_PILL,
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
    button('Review Your Mockup', approvalUrl) +
    note(`This approval link expires in <strong>72 hours</strong>. Have questions? Just reply to this email.`);

  return sendEmail({
    to: customerEmail,
    subject: `Your GIVOO Mockup is Ready - Order ${orderId}`,
    html: renderEmail({
      heading: 'Your mockup is ready for approval',
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
    button('View Order', `${APP_URL}/admin/orders/${orderId}`);

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
  // Optional: price summary + invoice attachment (passed at order placement).
  amounts?: PriceBreakdown;
  attachments?: EmailAttachment[];
}) {
  const balance = Math.max(0, options.grandTotal - options.amountPaid);
  const orderUrl = `${APP_URL}/dashboard/orders/${options.orderId}`;

  // Prefer the priced summary; fall back to a short payment summary when the
  // amounts aren't available (e.g. balance payments).
  const summary =
    options.amounts
      ? priceBreakdownCard(options.amounts, {
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
      ? p(
          `Your ${invoiceLabel(options.amountPaid, options.grandTotal).toLowerCase()} — with the full item-by-item breakdown, HSN codes and GST — is attached to this email as a PDF.`
        )
      : '') +
    button('View Your Order', orderUrl);

  return sendEmail({
    to: options.customerEmail,
    subject: `Payment Received — Order ${options.orderNumber}`,
    html: renderEmail({
      heading: 'Payment received — thank you!',
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
    button('View Your Order', orderUrl);

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
    p(`Thanks for approving the mockup for order <strong>${esc(options.orderNumber)}</strong>!`) +
    p(`To start production, please complete the remaining balance of <strong style="color:${COLORS.ink};">${inr(options.balanceDue)}</strong>.`) +
    button(`Pay ${inr(options.balanceDue)} Now`, payUrl) +
    `<p style="margin:0;font-size:13px;color:${COLORS.muted};">You can also pay anytime from your order page in the GIVOO dashboard.</p>`;

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
    p(`Your GIVOO order <strong>${esc(orderId)}</strong> has been shipped and is on its way to you.`) +
    (trackingUrl ? button('Track Your Shipment', trackingUrl) : '') +
    p('Thank you for choosing GIVOO!');

  return sendEmail({
    to: customerEmail,
    subject: `Your Order ${orderId} Has Been Shipped`,
    html: renderEmail({
      heading: 'Your order has shipped!',
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
    p(`Your GIVOO order <strong>${esc(options.orderNumber)}</strong> has been shipped and is on its way to you.`) +
    summary +
    button('Track Your Shipment', options.trackingUrl) +
    p('Thank you for choosing GIVOO!');

  return sendEmail({
    to: options.companyEmail,
    subject: `Your Order ${options.orderNumber} Has Been Shipped - AWB ${options.awbCode}`,
    html: renderEmail({
      heading: 'Your order has shipped!',
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
    p('We aim to resolve this within 48 hours of order delivery. You can track the status of your dispute in your GIVOO dashboard.') +
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
    open: BRAND_PILL,
    under_review: BRAND_PILL,
    resolved: BRAND_PILL,
    closed: NEUTRAL_PILL,
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
    p(`We've received your order <strong>${esc(options.orderNumber)}</strong> for ${options.packQuantity} gift packs and our team is getting started.`) +
    itemsCard +
    priceBreakdownCard(options.amounts) +
    p("Our design team will prepare your branded mockups next. We'll email you the moment they're ready for approval.") +
    (options.attachments?.length
      ? p(
          'Your proforma invoice — with the full item-by-item breakdown, HSN codes and GST — is attached to this email as a PDF.'
        )
      : '') +
    button('View Your Order', orderUrl);

  return sendEmail({
    to: options.customerEmail,
    subject: `Order Confirmed — ${options.orderNumber}`,
    html: renderEmail({
      heading: 'Order confirmed — thank you!',
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
  bypassOptOut?: boolean; // admin test sends should always deliver
}) {
  const greeting = options.customerName ? `Hi ${esc(options.customerName)},` : 'Hi there,';
  const prefsUrl = `${APP_URL}/dashboard/settings/notifications`;

  const image = options.imageUrl
    ? `<img src="${options.imageUrl}" alt="${esc(options.headline)}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border-radius:12px;margin:0 0 20px;" />`
    : '';

  // The composer sends rich text; older plain-text bodies still render as paragraphs.
  const isRichText = /<(p|h[1-6]|ul|ol|blockquote|pre|table|img|hr|div|br)\b/i.test(options.body);
  const bodyHtml = isRichText
    ? richTextToEmailHtml(options.body)
    : esc(options.body)
        .split(/\n{2,}/)
        .map((para) => p(para.replace(/\n/g, '<br/>')))
        .join('');

  const cta =
    options.ctaLabel && options.ctaUrl ? button(options.ctaLabel, options.ctaUrl) : '';

  const content = `<p style="margin:0 0 16px;font-size:15px;color:${COLORS.muted};">${greeting}</p>` + image + bodyHtml + cta;

  return sendEmail({
    to: options.to,
    subject: options.subject,
    html: renderEmail({
      heading: options.headline,
      preheader: options.subject,
      contentHtml: content,
      footerNote: `You're receiving this because you opted in to offers from GIVOO. <a href="${prefsUrl}" style="color:${COLORS.muted};text-decoration:underline;">Manage your email preferences</a>.`,
    }),
    category: options.bypassOptOut ? undefined : 'marketing',
  });
}

/**
 * Admin-created proposal email: a personalised gift-pack quote sent to a lead.
 * Links to the shareable quote page (which offers the PDF + proposal deck and
 * a path to checkout) and attaches the proposal deck PDF when available.
 */
export async function sendProposalEmail(options: {
  to: string;
  recipientName?: string | null;
  companyName?: string | null;
  quoteToken: string;
  /** Token of the compare page listing every pack option (multi-pack only). */
  proposalToken?: string | null;
  packQuantity: number;
  productNames: string[];
  grandTotal: number;
  /** Every option in the proposal. Omitted for legacy single-pack sends. */
  packs?: {
    label: string;
    tagline?: string | null;
    quoteToken: string;
    packQuantity: number;
    productNames: string[];
    grandTotal: number;
  }[];
  validUntil: Date;
  message?: string | null;
  attachments?: EmailAttachment[];
}) {
  const greeting = options.recipientName ? `Hi ${esc(options.recipientName)},` : 'Hi there,';

  // Normalise to a list of options so single- and multi-pack sends share one
  // code path.
  const packs =
    options.packs && options.packs.length > 0
      ? options.packs
      : [
          {
            label: 'Your pack',
            tagline: null,
            quoteToken: options.quoteToken,
            packQuantity: options.packQuantity,
            productNames: options.productNames,
            grandTotal: options.grandTotal,
          },
        ];
  const isMulti = packs.length > 1;

  const ctaUrl =
    isMulti && options.proposalToken
      ? `${APP_URL}/proposal/${options.proposalToken}`
      : `${APP_URL}/quote/${packs[0]?.quoteToken ?? options.quoteToken}`;

  const intro = isMulti
    ? options.companyName
      ? `We've put together <strong>${packs.length} gift pack options</strong> for <strong>${esc(options.companyName)}</strong> — each priced separately so you can compare and pick the one that fits your budget.`
      : `We've put together <strong>${packs.length} gift pack options</strong> for you — each priced separately so you can compare and pick the one that fits your budget.`
    : options.companyName
      ? `We've put together a curated gift pack proposal for <strong>${esc(options.companyName)}</strong>. Here's a quick summary — the full details, imagery and pricing breakdown are one click away.`
      : `We've put together a curated gift pack proposal for you. Here's a quick summary — the full details, imagery and pricing breakdown are one click away.`;

  const personalNote = options.message
    ? note(esc(options.message).replace(/\n/g, '<br/>'))
    : '';

  /** One option: name, contents, per-pack price, total and its own link. */
  const packBlock = (pack: (typeof packs)[number], index: number) => {
    const perPack = pack.packQuantity > 0 ? pack.grandTotal / pack.packQuantity : pack.grandTotal;
    const items = pack.productNames
      .slice(0, 8)
      .map((n) => `<li style="margin:0 0 5px;font-size:14px;color:${COLORS.body};">${esc(n)}</li>`)
      .join('');
    const moreCount = pack.productNames.length - 8;

    return `<div style="border:1px solid ${COLORS.border};border-radius:12px;padding:18px 20px;margin:0 0 16px;background-color:${COLORS.surface};">
      ${isMulti ? `<p style="margin:0 0 4px;">${badge(`Option ${index + 1}`)}</p>` : ''}
      <p style="margin:${isMulti ? '8px' : '0'} 0 2px;font-size:17px;font-weight:700;color:${COLORS.ink};">${esc(pack.label)}</p>
      ${pack.tagline ? `<p style="margin:0 0 10px;font-size:13px;color:${COLORS.muted};">${esc(pack.tagline)}</p>` : '<div style="height:8px;"></div>'}
      <ul style="margin:0 0 14px;padding-left:20px;">${items}${
        moreCount > 0
          ? `<li style="margin:0 0 5px;font-size:14px;color:${COLORS.muted};">+ ${moreCount} more</li>`
          : ''
      }</ul>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${row('Gift packs', String(pack.packQuantity))}
        ${row('Items per pack', String(pack.productNames.length))}
        ${row('Price per pack (incl. GST)', inr(perPack))}
        <tr><td colspan="2" style="padding:0;"><div style="border-top:2px solid ${COLORS.border};margin:8px 0 2px;"></div></td></tr>
        ${row('Total (incl. GST)', `<span style="font-size:16px;">${inr(pack.grandTotal)}</span>`, true)}
      </table>
      <p style="margin:14px 0 0;font-size:14px;">
        <a href="${APP_URL}/quote/${pack.quoteToken}" target="_blank" style="color:${COLORS.brand};font-weight:700;text-decoration:none;">View ${esc(pack.label)} &rarr;</a>
      </p>
    </div>`;
  };

  const validUntilStr = options.validUntil.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const content =
    `<p style="margin:0 0 16px;font-size:15px;color:${COLORS.muted};">${greeting}</p>` +
    p(intro) +
    personalNote +
    `<p style="margin:0 0 10px;font-size:14px;font-weight:700;color:${COLORS.ink};">${
      isMulti ? `Your ${packs.length} options` : "What's inside"
    }</p>` +
    packs.map(packBlock).join('') +
    `<p style="margin:0 0 20px;font-size:12px;color:${COLORS.muted};">Shipping is not included — it's calculated at checkout based on your delivery address.</p>` +
    button(isMulti ? 'Compare All Options' : 'View Your Proposal', ctaUrl) +
    p(
      `This proposal is valid until <strong>${validUntilStr}</strong>. ${
        options.attachments?.length
          ? 'We’ve also attached the full proposal deck as a PDF for easy sharing with your team.'
          : ''
      }`
    ) +
    p(
      isMulti
        ? `Want a pack that sits between these options? Just reply to this email — we're happy to adjust.`
        : `Questions or want to tweak the pack? Just reply to this email — we're happy to adjust.`
    );

  return sendEmail({
    to: options.to,
    subject: isMulti
      ? `${packs.length} GIVOO gift pack options${options.companyName ? ` for ${options.companyName}` : ''}`
      : `Your GIVOO gift pack proposal${options.companyName ? ` for ${options.companyName}` : ''}`,
    html: renderEmail({
      heading: isMulti ? 'Your Gift Pack Options' : 'Your Gift Pack Proposal',
      preheader: isMulti
        ? `${packs.length} curated pack options, each priced separately — valid until ${validUntilStr}`
        : `A curated gifting proposal — ${options.packQuantity} packs, valid until ${validUntilStr}`,
      contentHtml: content,
    }),
    category: 'quotes',
    attachments: options.attachments,
  });
}
