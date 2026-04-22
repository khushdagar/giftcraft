import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Create quote with snapshot of builder state + pricing
    const quote = await prisma.quote.create({
      data: {
        shareToken: require('crypto').randomUUID(),
        status: 'active',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        payload: body, // Entire builder state + pricing
      },
      select: {
        id: true,
        shareToken: true,
        expiresAt: true,
      },
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error('Error creating quote:', error);
    return NextResponse.json(
      { error: 'Failed to create quote' },
      { status: 500 }
    );
  }
}
