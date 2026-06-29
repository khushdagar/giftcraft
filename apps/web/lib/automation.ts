import { prisma } from '@/lib/prisma';
import { AutomationTrigger, AutomationAction } from '@prisma/client';
import { sendCustomEmail } from '@/lib/email';

export interface AutomationContext {
  orderId?: string;
  companyId?: string;
  customerEmail?: string;
  orderNumber?: string;
  quoteId?: string;
  disputeId?: string;
  [key: string]: any;
}

export async function executeTrigger(
  trigger: AutomationTrigger,
  context: AutomationContext
) {
  try {
    const rules = await prisma.automationRule.findMany({
      where: {
        trigger,
        isActive: true,
      },
    });

    for (const rule of rules) {
      await executeAction(rule.action, rule.actionJson as Record<string, any>, context);
    }
  } catch (error) {
    console.error('Error executing automation trigger:', error);
  }
}

async function executeAction(
  action: AutomationAction,
  actionJson: Record<string, any>,
  context: AutomationContext
) {
  try {
    switch (action) {
      case 'send_email':
        await sendEmailAction(actionJson, context);
        break;
      case 'send_whatsapp':
        await sendWhatsAppAction(actionJson, context);
        break;
      case 'notify_admin':
        await notifyAdminAction(actionJson, context);
        break;
      case 'update_order_status':
        await updateOrderStatusAction(actionJson, context);
        break;
      default:
        console.warn(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error(`Error executing action ${action}:`, error);
  }
}

// Replace {{token}} placeholders in automation copy with values from the
// trigger context (e.g. {{orderNumber}}, {{customerEmail}}).
function interpolate(text: string, context: AutomationContext): string {
  return (text || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const value = context[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

async function sendEmailAction(
  config: Record<string, any>,
  context: AutomationContext
) {
  const { recipientEmail, subject, template, body } = config;

  const email = recipientEmail === 'customer' ? context.customerEmail : recipientEmail;

  if (!email) {
    console.warn('No email recipient found for automation');
    return;
  }

  const resolvedSubject = interpolate(subject || 'Update from GiftCraft', context);
  // `template`/`body` is free-form copy entered by an admin; render line breaks.
  const copy = interpolate(body || template || '', context);
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;">
      ${copy
        .split(/\n{2,}/)
        .map((p) => `<p style="font-size:15px;line-height:1.6;color:#3F3F46;">${p.replace(/\n/g, '<br/>')}</p>`)
        .join('')}
      <p style="font-size:13px;color:#A1A1AA;margin-top:24px;">— The GiftCraft Team</p>
    </div>
  `;

  // Recipient is the customer ⇒ honour their order-status opt-out; an explicit
  // admin/internal address is uncategorised and always sends.
  const category = recipientEmail === 'customer' ? 'orderStatus' : undefined;

  const result = await sendCustomEmail({ to: email, subject: resolvedSubject, html, category });
  if (result.success) {
    console.log(`Automation email sent to ${email}: ${resolvedSubject}`);
  } else if ((result as any).skipped) {
    console.log(`Automation email skipped (opt-out) for ${email}`);
  } else {
    console.error(`Automation email failed for ${email}`);
  }
}

async function sendWhatsAppAction(
  config: Record<string, any>,
  context: AutomationContext
) {
  const { recipientPhone, message } = config;

  if (!recipientPhone && !context.companyId) {
    console.warn('No phone number found for WhatsApp automation');
    return;
  }

  console.log(`Sending WhatsApp: ${message}`);

  // TODO: Integrate with Interakt/Wati API when set up
  // For now, just log the action
}

async function notifyAdminAction(
  config: Record<string, any>,
  context: AutomationContext
) {
  const { message, severity = 'info' } = config;

  console.log(`[${severity.toUpperCase()}] Admin notification: ${message}`);

  // TODO: Send to admin via email, Slack, or in-app notification
  // For now, just log the action
}

async function updateOrderStatusAction(
  config: Record<string, any>,
  context: AutomationContext
) {
  const { newStatus } = config;

  if (!context.orderId || !newStatus) {
    console.warn('Missing orderId or newStatus for order status update');
    return;
  }

  try {
    await prisma.order.update({
      where: { id: context.orderId },
      data: { status: newStatus },
    });

    console.log(`Order ${context.orderId} status updated to ${newStatus}`);
  } catch (error) {
    console.error('Error updating order status:', error);
  }
}
