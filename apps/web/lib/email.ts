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
