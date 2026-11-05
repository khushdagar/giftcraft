import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { zEmail, zPersonName, zPhone } from '@/lib/zod-fields';
import { sendPushToAdmins } from '@/lib/push';
import { GhlApiError, syncWebsiteEnquiryToGhl } from '@/lib/ghl';
import { renderEmail, sendCustomEmail } from '@/lib/email';
import { esc } from '@/lib/email-theme';

const EnquirySchema = z.object({
  companyName: zPersonName('Company name').max(200),
  contactName: zPersonName('Contact name').max(200),
  email: zEmail,
  phone: zPhone,
  quantity: z.coerce.number().int().positive().max(1000000).optional(),
  message: z.string().trim().max(2000).optional(),
  productId: z.string().optional(),
  productName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = EnquirySchema.parse(body);

    try {
      await syncWebsiteEnquiryToGhl({
        companyName: data.companyName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        quantity: data.quantity,
        message: data.message,
        productName: data.productName,
      });
    } catch (error) {
      console.error('GoHighLevel website enquiry sync failed:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof GhlApiError && (error.status === 401 || error.status === 403)
              ? 'The GHL connection needs contacts.write permission. Please contact the site administrator.'
              : 'Could not submit your enquiry. Please try again.',
        },
        { status: 502 }
      );
    }

    const enquiry = await prisma.enquiry.create({
      data: {
        companyName: data.companyName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        quantity: data.quantity ?? null,
        message: data.message || null,
        productId: data.productId || null,
        productName: data.productName || null,
      },
      select: { id: true },
    });

    const adminEmail = process.env.ENQUIRY_ADMIN_EMAIL || 'hello@givoo.in';
    const adminEmailResult = await sendCustomEmail({
      to: adminEmail,
      subject: `New website enquiry from ${data.companyName}`,
      html: renderEmail({
        heading: 'New website enquiry',
        preheader: `New enquiry from ${data.contactName} at ${data.companyName}`,
        contentHtml: [
          `<p><strong>Company:</strong> ${esc(data.companyName)}</p>`,
          `<p><strong>Contact:</strong> ${esc(data.contactName)}</p>`,
          `<p><strong>Email:</strong> ${esc(data.email)}</p>`,
          `<p><strong>Phone:</strong> ${esc(data.phone)}</p>`,
          data.productName ? `<p><strong>Product:</strong> ${esc(data.productName)}</p>` : '',
          data.quantity ? `<p><strong>Quantity:</strong> ${data.quantity}</p>` : '',
          data.message
            ? `<p><strong>Message:</strong><br />${esc(data.message).replace(/\r?\n/g, '<br />')}</p>`
            : '',
        ].join(''),
        footerNote: 'This enquiry was submitted through the GIVOO website.',
      }),
    });
    if (!adminEmailResult.success) {
      console.error('Website enquiry admin email failed:', adminEmailResult.error || 'Email skipped');
    }

    const customerEmailResult = await sendCustomEmail({
      to: data.email,
      subject: 'We received your enquiry | GIVOO',
      html: renderEmail({
        heading: 'Thanks for contacting GIVOO',
        preheader: 'We received your gifting enquiry.',
        contentHtml: [
          `<p>Hi ${esc(data.contactName)},</p>`,
          '<p>Thank you for contacting GIVOO. We have received your enquiry and our gifting team will get in touch with you shortly.</p>',
          data.productName ? `<p><strong>Product:</strong> ${esc(data.productName)}</p>` : '',
          data.quantity ? `<p><strong>Quantity:</strong> ${data.quantity}</p>` : '',
          data.message
            ? `<p><strong>Your message:</strong><br />${esc(data.message).replace(/\r?\n/g, '<br />')}</p>`
            : '',
        ].join(''),
        footerNote: 'This is a confirmation that we received your enquiry; it is not an order confirmation.',
      }),
    });
    if (!customerEmailResult.success) {
      console.error('Website enquiry confirmation email failed:', customerEmailResult.error || 'Email skipped');
    }

    // Leads go cold fast — alert admins immediately. Tag matches the bell's
    // enquiry-<id> key so the two don't stack up.
    sendPushToAdmins({
      title: `New enquiry from ${data.companyName}`,
      body: data.productName
        ? `About ${data.productName}${data.quantity ? ` — ${data.quantity} units` : ''}`
        : `${data.contactName} — ${data.phone}`,
      url: '/admin/enquiries',
      tag: `enquiry-${enquiry.id}`,
    }).catch(() => {});

    return NextResponse.json({ success: true, data: { id: enquiry.id } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0]?.message || 'Invalid data' },
        { status: 400 }
      );
    }
    console.error('Error creating enquiry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit enquiry' },
      { status: 500 }
    );
  }
}
