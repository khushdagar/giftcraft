import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const consentSchema = z.object({
  kind: z.enum(['marketing_email', 'marketing_whatsapp', 'analytics', 'dpdp_consent']),
  granted: z.boolean(),
});

const CONSENT_KINDS = ['marketing_email', 'marketing_whatsapp', 'analytics', 'dpdp_consent'] as const;

/**
 * GET /api/consent
 * Returns the current (latest) consent state per kind for the signed-in user.
 * Consent is stored append-only in ConsentLog, so "current" = most recent row.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logs = await prisma.consentLog.findMany({
      where: { userId: session.user.id },
      orderBy: { grantedAt: 'desc' },
      select: { kind: true, granted: true, grantedAt: true },
    });

    // First occurrence per kind is the latest because rows are sorted desc.
    const state: Record<string, boolean> = {};
    const updatedAt: Record<string, string | null> = {};
    for (const kind of CONSENT_KINDS) {
      state[kind] = false;
      updatedAt[kind] = null;
    }
    for (const log of logs) {
      if (updatedAt[log.kind] === null) {
        state[log.kind] = log.granted;
        updatedAt[log.kind] = log.grantedAt.toISOString();
      }
    }

    return NextResponse.json({ success: true, data: { state, updatedAt } });
  } catch (error) {
    console.error('GET /api/consent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
