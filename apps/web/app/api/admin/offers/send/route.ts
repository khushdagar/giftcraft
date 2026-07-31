import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendOfferEmail } from '@/lib/email';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const sendSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  headline: z.string().min(1, 'Headline is required'),
  // Rich text (HTML) from the offer composer. An "empty" editor still emits
  // "<p></p>", so require actual text or a visual element.
  body: z
    .string()
    .min(1, 'Body is required')
    .refine(
      (v) =>
        v.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0 ||
        /<(img|hr|table)\b/i.test(v),
      'Body is required'
    ),
  ctaLabel: z.string().optional(),
  ctaUrl: z.string().url().optional().or(z.literal('')),
  imageUrl: z.string().url().optional().or(z.literal('')),
  testEmail: z.string().email().optional(), // send a single preview to this address only
  recipientIds: z.array(z.string()).optional(), // limit send to these opted-in users
});

// Customers who opted into marketing emails (prefsJson.marketing === true).
async function getRecipients() {
  return prisma.user.findMany({
    where: {
      notificationPref: { prefsJson: { path: ['marketing'], equals: true } },
    },
    select: { id: true, email: true, name: true },
    orderBy: { name: 'asc' },
  });
}

export async function GET() {
  const session = await auth();
  if (!session || session.user?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const recipients = await getRecipients();
  return NextResponse.json({
    success: true,
    data: { recipientCount: recipients.length, recipients },
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = sendSchema.parse(body);

    const offer = {
      subject: parsed.subject,
      headline: parsed.headline,
      body: parsed.body,
      ctaLabel: parsed.ctaLabel || undefined,
      ctaUrl: parsed.ctaUrl || undefined,
      imageUrl: parsed.imageUrl || undefined,
    };

    // Test mode: send one preview to the admin's chosen address, skip the list.
    if (parsed.testEmail) {
      const result = await sendOfferEmail({
        ...offer,
        to: parsed.testEmail,
        bypassOptOut: true,
      });
      if (!result.success) {
        return NextResponse.json(
          { error: 'Test email could not be sent. Check the email service configuration.' },
          { status: 502 }
        );
      }
      return NextResponse.json({
        success: true,
        data: { test: true, sent: 1, recipientCount: 1 },
      });
    }

    let recipients = await getRecipients();

    // Selected-customers mode: only send to the chosen subset. Filtering against
    // the opted-in list means a stale/forged id can never email an opted-out user.
    if (parsed.recipientIds && parsed.recipientIds.length > 0) {
      const wanted = new Set(parsed.recipientIds);
      recipients = recipients.filter((r) => wanted.has(r.id));
      if (recipients.length === 0) {
        return NextResponse.json(
          { error: 'None of the selected customers are opted into marketing emails' },
          { status: 400 }
        );
      }
    }

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    // Send sequentially in best-effort fashion; sendOfferEmail re-checks each
    // recipient's marketing opt-out as a safety net.
    const results = await Promise.allSettled(
      recipients.map((r) =>
        sendOfferEmail({ ...offer, to: r.email, customerName: r.name || undefined })
      )
    );

    for (const res of results) {
      if (res.status === 'fulfilled' && res.value.success) sent++;
      else if (res.status === 'fulfilled' && (res.value as any).skipped) skipped++;
      else failed++;
    }

    return NextResponse.json({
      success: true,
      data: { recipientCount: recipients.length, sent, skipped, failed },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }
    console.error('POST /api/admin/offers/send:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
