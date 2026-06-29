import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendOfferEmail } from '@/lib/email';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const sendSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  headline: z.string().min(1, 'Headline is required'),
  body: z.string().min(1, 'Body is required'),
  ctaLabel: z.string().optional(),
  ctaUrl: z.string().url().optional().or(z.literal('')),
  imageUrl: z.string().url().optional().or(z.literal('')),
  testEmail: z.string().email().optional(), // send a single preview to this address only
});

// Customers who opted into marketing emails (prefsJson.marketing === true).
async function getRecipients() {
  return prisma.user.findMany({
    where: {
      notificationPref: { prefsJson: { path: ['marketing'], equals: true } },
    },
    select: { email: true, name: true },
  });
}

export async function GET() {
  const session = await auth();
  if (!session || session.user?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const recipients = await getRecipients();
  return NextResponse.json({ success: true, data: { recipientCount: recipients.length } });
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
      const result = await sendOfferEmail({ ...offer, to: parsed.testEmail });
      return NextResponse.json({
        success: true,
        data: { test: true, sent: result.success ? 1 : 0, recipientCount: 1 },
      });
    }

    const recipients = await getRecipients();

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
