import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { HUB_PATH, hubSettingKey, type CuratedHub } from '@/lib/curated-hub-content';

const HubSchema = z.enum(['budget', 'occasions']);

const BodySchema = z.object({
  pageTitle: z.string().max(200).nullable(),
  description: z.string().max(2000).nullable(),
  metaTitle: z.string().max(200).nullable(),
  metaDescription: z.string().max(500).nullable(),
  contentBelow: z.string().nullable(),
  faqs: z
    .array(z.object({ question: z.string().min(1), answer: z.string().min(1) }))
    .max(50)
    .default([]),
});

export async function PUT(request: NextRequest, { params }: { params: { hub: string } }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const parsedHub = HubSchema.safeParse(params.hub);
    if (!parsedHub.success) {
      return NextResponse.json({ error: 'Unknown hub' }, { status: 404 });
    }
    const hub: CuratedHub = parsedHub.data;

    const data = BodySchema.parse(await request.json());
    const value = {
      pageTitle: data.pageTitle ?? '',
      description: data.description ?? '',
      metaTitle: data.metaTitle ?? '',
      metaDescription: data.metaDescription ?? '',
      contentBelow: data.contentBelow ?? '',
      faqs: data.faqs,
    };

    await prisma.platformSetting.upsert({
      where: { key: hubSettingKey(hub) },
      update: { value },
      create: { key: hubSettingKey(hub), value },
    });

    // The hub is ISR-cached for an hour; publish the edit straight away.
    revalidatePath(HUB_PATH[hub]);

    return NextResponse.json({ success: true, data: value });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || 'Invalid data' }, { status: 400 });
    }
    console.error('Error saving curated hub content:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
