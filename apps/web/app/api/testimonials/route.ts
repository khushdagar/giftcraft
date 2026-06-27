import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET /api/testimonials
 * Active testimonials for the homepage carousel (public).
 */
export async function GET() {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        quote: true,
        authorName: true,
        authorRole: true,
        companyName: true,
      },
    });
    return NextResponse.json({ testimonials });
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    // Never break the homepage — the client falls back to its defaults.
    return NextResponse.json({ testimonials: [] });
  }
}
