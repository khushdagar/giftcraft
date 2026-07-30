import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// Resolve by slug or id — mirrors /api/products/[slug].
async function resolveProduct(slugOrId: string) {
  return prisma.product.findFirst({
    where: { status: 'active', OR: [{ slug: slugOrId }, { id: slugOrId }] },
    select: { id: true },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const product = await resolveProduct(params.slug);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const session = await auth();

    const [reviews, distribution, ownReview] = await Promise.all([
      prisma.review.findMany({
        where: { productId: product.id, status: 'approved' },
        include: { user: { select: { name: true, image: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.groupBy({
        by: ['rating'],
        where: { productId: product.id, status: 'approved' },
        _count: { rating: true },
      }),
      session?.user?.id
        ? prisma.review.findUnique({
            where: {
              productId_userId: { productId: product.id, userId: session.user.id },
            },
          })
        : Promise.resolve(null),
    ]);

    const total = distribution.reduce((s, d) => s + d._count.rating, 0);
    const sum = distribution.reduce((s, d) => s + d.rating * d._count.rating, 0);
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distribution.forEach((d) => {
      counts[d.rating] = d._count.rating;
    });

    return NextResponse.json({
      success: true,
      data: {
        reviews: reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          comment: r.comment,
          isVerifiedBuyer: r.isVerifiedBuyer,
          authorName: r.user?.name || 'GIVOO Customer',
          authorImage: r.user?.image || null,
          createdAt: r.createdAt,
        })),
        summary: {
          average: total > 0 ? Math.round((sum / total) * 10) / 10 : 0,
          total,
          counts,
        },
        // The viewer's own review in any status, so the UI can show
        // "pending approval" and pre-fill the edit form.
        ownReview: ownReview
          ? {
              id: ownReview.id,
              rating: ownReview.rating,
              title: ownReview.title,
              comment: ownReview.comment,
              status: ownReview.status,
              isVerifiedBuyer: ownReview.isVerifiedBuyer,
              createdAt: ownReview.createdAt,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Please sign in to write a review' },
        { status: 401 }
      );
    }

    const product = await resolveProduct(params.slug);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const body = await request.json();
    const rating = Number(body.rating);
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : null;
    const comment = typeof body.comment === 'string' ? body.comment.trim() : '';

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5 stars' },
        { status: 400 }
      );
    }
    if (comment.length < 10) {
      return NextResponse.json(
        { error: 'Please write at least 10 characters about the product' },
        { status: 400 }
      );
    }
    if (comment.length > 2000) {
      return NextResponse.json(
        { error: 'Review is too long (max 2000 characters)' },
        { status: 400 }
      );
    }

    // Verified Buyer = has a paid order that contains this product.
    const paidOrder = await prisma.order.findFirst({
      where: {
        placedById: session.user.id,
        paidAt: { not: null },
        items: { some: { productId: product.id } },
      },
      select: { id: true },
    });

    // One review per user per product — an edit overwrites and goes back to
    // pending so it re-enters moderation.
    const review = await prisma.review.upsert({
      where: {
        productId_userId: { productId: product.id, userId: session.user.id },
      },
      create: {
        productId: product.id,
        userId: session.user.id,
        rating,
        title: title || null,
        comment,
        isVerifiedBuyer: !!paidOrder,
      },
      update: {
        rating,
        title: title || null,
        comment,
        status: 'pending',
        isVerifiedBuyer: !!paidOrder,
      },
    });

    return NextResponse.json({ success: true, data: review }, { status: 201 });
  } catch (error) {
    console.error('Error submitting review:', error);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
