import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const defaultPrefs = {
  email: true,
  whatsapp: false,
  push: false,
  orderStatus: true,
  quotes: true,
  disputes: true,
  marketing: false,
};

const preferencesSchema = z.object({
  email: z.boolean().optional(),
  whatsapp: z.boolean().optional(),
  push: z.boolean().optional(),
  orderStatus: z.boolean().optional(),
  quotes: z.boolean().optional(),
  disputes: z.boolean().optional(),
  marketing: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, prefsJson: defaultPrefs },
      update: {},
    });

    return NextResponse.json({
      success: true,
      data: preferences.prefsJson,
    });
  } catch (error) {
    console.error('GET /api/settings/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const parsed = preferencesSchema.parse(body);

    // Single round-trip — the client always sends the full preference object,
    // so merging over the defaults is enough and saves a read before the write.
    const nextPrefs = { ...defaultPrefs, ...parsed };

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, prefsJson: nextPrefs },
      update: { prefsJson: nextPrefs },
    });

    return NextResponse.json({
      success: true,
      data: preferences.prefsJson,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('PATCH /api/settings/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
