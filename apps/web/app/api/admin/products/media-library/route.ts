import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export interface MediaLibraryEntry {
  url: string;
  altText: string | null;
  /** Where the image came from — the product name, or the blog post title. */
  productName: string | null;
  /** Object name in Spaces with the upload timestamp prefix stripped. */
  fileName: string;
}

/** `…/blog/1786985183032-mryvp4-farewell-gift.webp` → `farewell-gift.webp`. */
function fileNameOf(url: string): string {
  let name = (url.split('?')[0] ?? '').split('/').pop() ?? '';
  try {
    name = decodeURIComponent(name);
  } catch {
    /* keep raw */
  }
  return name.replace(/^\d{10,}-[a-z0-9]+-/, '');
}

/**
 * GET /api/admin/products/media-library?search=&limit=
 * Everything already uploaded — product images plus blog cover / share images —
 * so an admin can reuse a file instead of uploading a duplicate. Searchable by
 * file name, product name, SKU, blog title or alt text. De-duplicated by URL,
 * newest first.
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
    const contains = { contains: search, mode: 'insensitive' as const };

    const [images, posts] = await Promise.all([
      prisma.productImage.findMany({
        where: search
          ? {
              OR: [
                { url: contains },
                { altText: contains },
                { product: { name: contains } },
                { product: { sku: contains } },
              ],
            }
          : undefined,
        orderBy: { id: 'desc' },
        take: limit * 2, // over-fetch to survive de-duplication
        select: { url: true, altText: true, product: { select: { name: true } } },
      }),
      prisma.blogPost.findMany({
        where: {
          OR: [{ coverImageUrl: { not: null } }, { ogImageUrl: { not: null } }],
          ...(search
            ? {
                AND: [
                  {
                    OR: [
                      { title: contains },
                      { coverImageUrl: contains },
                      { ogImageUrl: contains },
                      { coverImageAlt: contains },
                    ],
                  },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { title: true, coverImageUrl: true, coverImageAlt: true, ogImageUrl: true },
      }),
    ]);

    const seen = new Set<string>();
    const media: MediaLibraryEntry[] = [];
    const push = (url: string | null, altText: string | null, productName: string | null) => {
      if (!url || seen.has(url) || media.length >= limit) return;
      seen.add(url);
      media.push({ url, altText, productName, fileName: fileNameOf(url) });
    };

    for (const img of images) push(img.url, img.altText, img.product?.name ?? null);
    for (const p of posts) {
      push(p.coverImageUrl, p.coverImageAlt, p.title);
      push(p.ogImageUrl, p.coverImageAlt, p.title);
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
