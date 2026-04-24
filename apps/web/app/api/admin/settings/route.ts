import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const SaveSettingsSchema = z.object({
  category: z.string().min(1),
  data: z.record(z.any()),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const settings = await prisma.platformSetting.findMany();

    const grouped = settings.reduce((acc, setting) => {
      const category = setting.key.split('.')[0];
      if (!acc[category]) acc[category] = {};
      acc[category][setting.key] = setting.value;
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json(grouped);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { category, data } = SaveSettingsSchema.parse(body);

    const updatePromises = Object.entries(data).map(([key, value]) => {
      const fullKey = `${category}.${key}`;
      return prisma.platformSetting.upsert({
        where: { key: fullKey },
        update: { value },
        create: { key: fullKey, value },
      });
    });

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
