import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { BudgetBandSchema, assertNoOverlap } from '@/lib/budget-band-validation';

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const bands = await prisma.budgetBand.findMany({
      orderBy: [{ sortOrder: 'asc' }, { minPrice: 'asc' }],
    });
    return NextResponse.json(bands);
  } catch (error) {
    console.error('Error fetching budget bands:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const data = BudgetBandSchema.parse(await request.json());

    const existing = await prisma.budgetBand.findUnique({ where: { slug: data.slug } });
    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }

    const overlap = await assertNoOverlap(data);
    if (overlap) return NextResponse.json({ error: overlap }, { status: 409 });

    const band = await prisma.budgetBand.create({
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

    return NextResponse.json(band, { status: 201 });
  } catch (error) {
    console.error('Error creating budget band:', error);
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
