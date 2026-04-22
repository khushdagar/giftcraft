import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const packaging = await prisma.packaging.findMany({
      select: { id: true, name: true, price: true },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(packaging);
  } catch (error) {
    console.error('Error fetching packaging:', error);
    return NextResponse.json({ error: 'Failed to fetch packaging' }, { status: 500 });
  }
}
