import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { zEmail, zPersonName, zPhone } from '@/lib/zod-fields';

const bodySchema = z.object({
  quoteToken: z.string().min(1).max(200),
  name: zPersonName('Name').max(120).optional(),
  email: zEmail.max(200).optional(),
  phone: zPhone.optional(),
  company: z.string().trim().max(200).optional(),
});

// Logs a proposal-deck download. Logged-in users are identified from their
// session/account automatically; anonymous visitors must send name+email+phone
// (collected by the download dialog) — otherwise we reply requiresDetails so
// the client knows to open it.
export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request' },
        { status: 400 }
      );
    }
    const { quoteToken, name, email, phone, company } = parsed.data;

    const session = await auth();
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          email: true,
          phone: true,
          company: { select: { name: true } },
        },
      });
      await prisma.proposalDownload.create({
        data: {
          quoteToken,
          userId: session.user.id,
          name: user?.name || name || 'Account user',
          email: user?.email || email || '',
          phone: user?.phone || phone || null,
          company: user?.company?.name || company || null,
        },
      });
      return NextResponse.json({ success: true, data: { logged: true } });
    }

    if (!name || !email || !phone) {
      return NextResponse.json({ success: true, data: { requiresDetails: true } });
    }

    await prisma.proposalDownload.create({
      data: { quoteToken, name, email, phone, company: company || null },
    });
    return NextResponse.json({ success: true, data: { logged: true } });
  } catch (error) {
    console.error('Proposal download tracking error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to log download' },
      { status: 500 }
    );
  }
}
