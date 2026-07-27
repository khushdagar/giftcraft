import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/products/media-library?search=&limit=
 * Returns previously-uploaded product images so the admin can attach existing
 * media to a product instead of re-uploading. De-duplicated by URL, newest
 * first (approximated by most-recently-created products).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const limit = Math.min(Number(searchParams.get('limit')) || 200, 500);

    const images = await prisma.productImage.findMany({
      where: search
        ? {
            OR: [
              { altText: { contains: search, mode: 'insensitive' } },
              { product: { name: { contains: search, mode: 'insensitive' } } },
              { product: { sku: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : undefined,
      orderBy: { id: 'desc' },
      take: limit * 2, // over-fetch to survive de-duplication
      select: {
        url: true,
        altText: true,
        product: { select: { name: true } },
      },
    });

    // De-duplicate by URL, keep first occurrence.
    const seen = new Set<string>();
    const media: { url: string; altText: string | null; productName: string | null }[] = [];
    for (const img of images) {
      if (seen.has(img.url)) continue;
      seen.add(img.url);
      media.push({ url: img.url, altText: img.altText, productName: img.product?.name ?? null });
      if (media.length >= limit) break;
    }

    return NextResponse.json({ success: true, media });
  } catch (error) {
    console.error('Error loading media library:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load media' },
      { status: 500 }
    );
  }
}
