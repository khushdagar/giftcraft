import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const addons = await prisma.addon.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ addons });
  } catch (error) {
    console.error('Error fetching addons:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const CreateAddonSchema = z.object({
  name: z.string().min(1, 'Name required'),
  slug: z.string().min(1, 'Slug required'),
  price: z.number().min(0, 'Price must be positive'),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  sortOrder: z.number().int().default(1),
  isActive: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const data = CreateAddonSchema.parse(body);

    const addon = await prisma.addon.create({
      data: {
        name: data.name,
        slug: data.slug,
        price: data.price,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });

    return NextResponse.json(addon, { status: 201 });
  } catch (error) {
    console.error('Error creating addon:', error);
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
