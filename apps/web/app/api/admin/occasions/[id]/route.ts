import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const UpdateOccasionSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  icon: z.string().optional().nullable(),
  gradient: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  isCollection: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const occasion = await prisma.occasionConfig.findUnique({
      where: { id: params.id },
      include: { products: true },
    });

    if (!occasion) {
      return NextResponse.json({ error: 'Occasion not found' }, { status: 404 });
    }

    return NextResponse.json(occasion);
  } catch (error) {
    console.error('Error fetching occasion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const data = UpdateOccasionSchema.parse(body);

    const existing = await prisma.occasionConfig.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Occasion not found' }, { status: 404 });
    }

    // Check if new slug already exists (but not on current occasion)
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await prisma.occasionConfig.findUnique({
        where: { slug: data.slug },
      });
      if (slugExists) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
      }
    }

    const updated = await prisma.occasionConfig.update({
      where: { id: params.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.slug && { slug: data.slug }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.gradient !== undefined && { gradient: data.gradient }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isCollection !== undefined && { isCollection: data.isCollection }),
        ...(data.tags !== undefined && { tags: data.tags }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating occasion:', error);
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const occasion = await prisma.occasionConfig.findUnique({
      where: { id: params.id },
    });

    if (!occasion) {
      return NextResponse.json({ error: 'Occasion not found' }, { status: 404 });
    }

    // Delete all product-occasion links first
    await prisma.productOccasion.deleteMany({
      where: { occasionId: params.id },
    });

    // Then delete the occasion
    await prisma.occasionConfig.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting occasion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
