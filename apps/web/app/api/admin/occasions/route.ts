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

    const occasions = await prisma.occasionConfig.findMany({
      include: {
        products: { select: { productId: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(occasions);
  } catch (error) {
    console.error('Error fetching occasions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const CreateOccasionSchema = z.object({
  name: z.string().min(1, 'Name required'),
  slug: z.string().min(1, 'Slug required'),
  icon: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  gradient: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  isCollection: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const data = CreateOccasionSchema.parse(body);

    // Check if slug already exists
    const existing = await prisma.occasionConfig.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }

    const occasion = await prisma.occasionConfig.create({
      data: {
        name: data.name,
        slug: data.slug,
        icon: data.icon || '🎁',
        imageUrl: data.imageUrl || null,
        gradient: data.gradient || 'from-orange-400 to-yellow-400',
        description: data.description,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        isCollection: data.isCollection,
        tags: data.tags,
      },
    });

    return NextResponse.json(occasion, { status: 201 });
  } catch (error) {
    console.error('Error creating occasion:', error);
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
