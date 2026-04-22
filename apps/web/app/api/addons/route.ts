import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const addons = await prisma.addon.findMany({
      select: { id: true, name: true, price: true },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(addons);
  } catch (error) {
    console.error('Error fetching addons:', error);
    return NextResponse.json({ error: 'Failed to fetch addons' }, { status: 500 });
  }
}
