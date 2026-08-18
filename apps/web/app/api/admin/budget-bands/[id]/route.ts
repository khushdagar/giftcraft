import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { BudgetBandSchema, assertNoOverlap } from '@/lib/budget-band-validation';

async function requireAdmin() {
  const session = await auth();
  return !!session && session.user.role === 'super_admin';
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const data = BudgetBandSchema.parse(await request.json());

    const clashingSlug = await prisma.budgetBand.findUnique({ where: { slug: data.slug } });
    if (clashingSlug && clashingSlug.id !== params.id) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }

    const overlap = await assertNoOverlap(data, params.id);
    if (overlap) return NextResponse.json({ error: overlap }, { status: 409 });

    const band = await prisma.budgetBand.update({
      where: { id: params.id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        gradient: data.gradient || null,
        minPrice: data.minPrice,
        maxPrice: data.maxPrice ?? null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });

    return NextResponse.json(band);
  } catch (error) {
    console.error('Error updating budget band:', error);
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Nothing references a band — packs land in one by price alone — so a
    // delete never orphans anything. The packs simply stop being reachable by
    // budget until another band covers their price.
    await prisma.budgetBand.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting budget band:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
