import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const preferencesSchema = z.object({
  email: z.boolean().optional(),
  whatsapp: z.boolean().optional(),
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

    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId,
          prefsJson: {
            email: true,
            whatsapp: false,
            orderStatus: true,
            quotes: true,
            disputes: true,
            marketing: false,
          },
        },
      });
    }

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

    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId,
          prefsJson: {
            email: true,
            whatsapp: false,
            orderStatus: true,
            quotes: true,
            disputes: true,
            marketing: false,
            ...parsed,
          },
        },
      });
    } else {
      const currentPrefs = preferences.prefsJson as Record<string, any>;
      preferences = await prisma.notificationPreference.update({
        where: { userId },
        data: {
          prefsJson: {
            ...currentPrefs,
            ...parsed,
          },
        },
      });
    }

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
