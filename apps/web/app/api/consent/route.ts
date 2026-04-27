import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const consentSchema = z.object({
  kind: z.enum(['marketing_email', 'marketing_whatsapp', 'analytics', 'dpdp_consent']),
  granted: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const parsed = consentSchema.parse(body);

    // Get client IP address
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');

    const consentLog = await prisma.consentLog.create({
      data: {
        userId,
        kind: parsed.kind,
        granted: parsed.granted,
        ipAddress: ipAddress || undefined,
      },
    });

    return NextResponse.json(
      { success: true, data: consentLog },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('POST /api/consent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
