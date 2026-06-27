import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'orders@giftcraft.in';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'GiftCraft';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: EmailOptions) {
  try {
    await sgMail.send({
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return { success: true };
  } catch (error) {
    console.error('SendGrid error:', error);
    return { success: false, error };
  }
}

/**
 * Send artwork approval email to customer
 */
export async function sendArtworkApprovalEmail(
  customerEmail: string,
  customerName: string,
  approvalUrl: string,
  orderId: string
) {
  const html = `
    <h2>Your Artwork Mockup is Ready for Approval</h2>
    <p>Hi ${customerName},</p>
    <p>Your order <strong>${orderId}</strong> mockup is now ready for your review and approval.</p>
    <p>
      <a href="${approvalUrl}" style="
        display: inline-block;
        padding: 12px 24px;
        background-color: #10B981;
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: bold;
      ">
        Review Your Mockup
      </a>
    </p>
    <p>This link will expire in 72 hours. If you have any questions, please reply to this email.</p>
    <p>Best regards,<br/>The GiftCraft Team</p>
  `;

  return sendEmail({
    to: customerEmail,
    subject: `Your GiftCraft Mockup is Ready - Order ${orderId}`,
    html,
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
  const html = `
    <h2>Artwork Revision Requested</h2>
    <p>Customer <strong>${customerName}</strong> has requested revisions on order <strong>${orderId}</strong>.</p>
    <h3>Revision Notes:</h3>
    <p>${revisionNotes.replace(/\n/g, '<br/>')}</p>
    <p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/orders/${orderId}" style="
        display: inline-block;
        padding: 12px 24px;
        background-color: #1A3C6E;
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: bold;
      ">
        View Order
      </a>
    </p>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `Revision Request - Order ${orderId}`,
    html,
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
}) {
  const inr = (n: number) =>
    `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const balance = Math.max(0, options.grandTotal - options.amountPaid);
  const orderUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders/${options.orderId}`;

  const html = `
    <h2>Payment Received — Thank You!</h2>
    <p>Hi ${options.customerName},</p>
    <p>We've successfully received your ${options.isAdvance ? '10% advance' : 'full'} payment for order
      <strong>${options.orderNumber}</strong>.</p>
    <table style="border-collapse:collapse;font-size:14px;margin:16px 0;">
      <tr><td style="padding:4px 12px 4px 0;color:#6B7280;">Amount paid</td><td style="padding:4px 0;font-weight:bold;">${inr(options.amountPaid)}</td></tr>
      ${options.isAdvance ? `<tr><td style="padding:4px 12px 4px 0;color:#6B7280;">Balance due (after mockup approval)</td><td style="padding:4px 0;">${inr(balance)}</td></tr>` : ''}
      <tr><td style="padding:4px 12px 4px 0;color:#6B7280;">Order total</td><td style="padding:4px 0;">${inr(options.grandTotal)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6B7280;">Payment ID</td><td style="padding:4px 0;font-family:monospace;">${options.paymentId}</td></tr>
    </table>
    <p>Our design team will now prepare your branded mockups for approval.</p>
    <p>
      <a href="${orderUrl}" style="
        display: inline-block;
        padding: 12px 24px;
        background-color: #1A6B4F;
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: bold;
      ">
        View Your Order
      </a>
    </p>
    <p>Best regards,<br/>The GiftCraft Team</p>
  `;

  return sendEmail({
    to: options.customerEmail,
    subject: `Payment Received — Order ${options.orderNumber}`,
    html,
  });
}

// Human-readable order status labels for customer-facing emails.
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
  const orderUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders/${options.orderId}`;

  const html = `
    <h2>Order Update — ${label}</h2>
    <p>Hi ${options.customerName},</p>
    <p>${blurb}</p>
    <p>Order <strong>${options.orderNumber}</strong> is now <strong>${label}</strong>.</p>
    ${options.note ? `<p style="color:#52525B;"><em>${options.note}</em></p>` : ''}
    <p>
      <a href="${orderUrl}" style="
        display: inline-block;
        padding: 12px 24px;
        background-color: #1A6B4F;
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: bold;
      ">
        View Your Order
      </a>
    </p>
    <p>Best regards,<br/>The GiftCraft Team</p>
  `;

  return sendEmail({
    to: options.customerEmail,
    subject: `Order ${options.orderNumber} — ${label}`,
    html,
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
  const inr = (n: number) =>
    `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const payUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders/${options.orderId}`;

  const html = `
    <h2>Mockup Approved — Complete Your Payment</h2>
    <p>Hi ${options.customerName},</p>
    <p>Thanks for approving the mockup for order <strong>${options.orderNumber}</strong>! 🎉</p>
    <p>To start production, please complete the remaining balance of
      <strong>${inr(options.balanceDue)}</strong>.</p>
    <p>
      <a href="${payUrl}" style="
        display: inline-block;
        padding: 12px 24px;
        background-color: #C4963C;
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: bold;
      ">
        Pay ${inr(options.balanceDue)} Now
      </a>
    </p>
    <p style="font-size:13px;color:#52525B;">You can also pay anytime from your order page in the GiftCraft dashboard.</p>
    <p>Best regards,<br/>The GiftCraft Team</p>
  `;

  return sendEmail({
    to: options.customerEmail,
    subject: `Action needed: Complete payment for Order ${options.orderNumber}`,
    html,
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
  const trackingLink = trackingUrl
    ? `
    <p>
      <a href="${trackingUrl}" style="
        display: inline-block;
        padding: 12px 24px;
        background-color: #10B981;
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: bold;
      ">
        Track Your Shipment
      </a>
    </p>
    `
    : '';

  const html = `
    <h2>Your Order Has Been Shipped!</h2>
    <p>Hi ${customerName},</p>
    <p>Your GiftCraft order <strong>${orderId}</strong> has been shipped and is on its way to you.</p>
    ${trackingLink}
    <p>Thank you for choosing GiftCraft!</p>
    <p>Best regards,<br/>The GiftCraft Team</p>
  `;

  return sendEmail({
    to: customerEmail,
    subject: `Your Order ${orderId} Has Been Shipped`,
    html,
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
  const html = `
    <h2>Your Order Has Been Shipped!</h2>
    <p>Hi ${options.companyName},</p>
    <p>Your GiftCraft order <strong>${options.orderNumber}</strong> has been shipped and is on its way to you.</p>
    <h3>Shipping Details:</h3>
    <ul>
      <li><strong>AWB Code:</strong> ${options.awbCode}</li>
      <li><strong>Courier:</strong> ${options.courierName}</li>
    </ul>
    <p>
      <a href="${options.trackingUrl}" style="
        display: inline-block;
        padding: 12px 24px;
        background-color: #10B981;
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: bold;
      ">
        Track Your Shipment
      </a>
    </p>
    <p>Thank you for choosing GiftCraft!</p>
    <p>Best regards,<br/>The GiftCraft Team</p>
  `;

  return sendEmail({
    to: options.companyEmail,
    subject: `Your Order ${options.orderNumber} Has Been Shipped - AWB ${options.awbCode}`,
    html,
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
  const html = `
    <h2>We've Received Your Dispute</h2>
    <p>Hi ${options.customerName},</p>
    <p>Thank you for reporting an issue with order <strong>${options.orderNumber}</strong>. We've received your dispute and our team will review it shortly.</p>
    <h3>Dispute Details:</h3>
    <p><strong>Subject:</strong> ${options.subject}</p>
    <p><strong>Dispute ID:</strong> ${options.disputeId}</p>
    <p>We aim to resolve this within 48 hours of order delivery. You can track the status of your dispute in your GiftCraft dashboard.</p>
    <p>If you have any questions, please reply to this email.</p>
    <p>Best regards,<br/>The GiftCraft Team</p>
  `;

  return sendEmail({
    to: options.customerEmail,
    subject: `Dispute Received - Order ${options.orderNumber}`,
    html,
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
    open: 'We are reviewing your dispute',
    under_review: 'Our team is actively reviewing your dispute',
    resolved: 'Your dispute has been resolved',
    closed: 'Your dispute has been closed',
  };

  const html = `
    <h2>Update: Your Dispute Status</h2>
    <p>Hi ${options.customerName},</p>
    <p>We have an update on your dispute for order <strong>${options.orderNumber}</strong>.</p>
    <h3>Status: <strong>${options.status.replace('_', ' ').toUpperCase()}</strong></h3>
    <p>${statusText[options.status] || 'Your dispute status has been updated'}</p>
    ${options.resolutionNote ? `<h3>Resolution Note:</h3><p>${options.resolutionNote}</p>` : ''}
    <p>If you have any questions, please reply to this email.</p>
    <p>Best regards,<br/>The GiftCraft Team</p>
  `;

  return sendEmail({
    to: options.customerEmail,
    subject: `Dispute Update - Order ${options.orderNumber}`,
    html,
  });
}
