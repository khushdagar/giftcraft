import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Best approved product reviews for the homepage reviews section.
// Public — only ever exposes approved reviews.
export async function GET() {
  try {
    const reviews = await prisma.review.findMany({
      where: { status: 'approved' },
      include: {
        user: { select: { name: true, company: { select: { name: true } } } },
        product: { select: { name: true, slug: true } },
      },
      orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
      take: 9,
    });

    return NextResponse.json({
      success: true,
      data: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        isVerifiedBuyer: r.isVerifiedBuyer,
        authorName: r.user?.name || 'GIVOO Customer',
        authorCompany: r.user?.company?.name || null,
        productName: r.product.name,
        productSlug: r.product.slug,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching featured reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}
