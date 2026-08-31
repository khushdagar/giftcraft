import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/site';

/**
 * GET /blog/[slug]/og.jpg?v=<updatedAt>
 *
 * JPEG rendition of a blog post's social-share image, exactly 1200×630.
 *
 * Every upload is stored as WebP (lib/upload-to-digital-ocean.ts), and most
 * link unfurlers — Google Chat, WhatsApp, LinkedIn, Facebook — silently drop a
 * WebP og:image, so the preview card rendered without a picture even though
 * the meta tags were present. The post page points og:image / twitter:image
 * here instead. `?v=` is a cache-buster tied to the post's updatedAt.
 *
 * Deliberately NOT under /api: robots.txt disallows /api/ and Google's fetchers
 * honour it, which would hide the image from Google Chat and Search.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WIDTH = 1200;
const HEIGHT = 630;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = params;
  // Canonical host, not req.url — behind App Platform's proxy that would be the
  // container's internal origin.
  const fallback = () => NextResponse.redirect(`${SITE_URL}/opengraph-image`, 302);

  const post = await prisma.blogPost.findUnique({
    where: { slug },
    select: { status: true, publishedAt: true, ogImageUrl: true, coverImageUrl: true },
  });
  if (!post || post.status !== 'published' || !post.publishedAt || post.publishedAt > new Date()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const source = post.ogImageUrl || post.coverImageUrl;
  if (!source) return fallback();

  try {
    const res = await fetch(source, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Source image responded ${res.status}`);
    const declared = Number(res.headers.get('content-length') || 0);
    if (declared > MAX_SOURCE_BYTES) throw new Error('Source image too large');
    const input = Buffer.from(await res.arrayBuffer());
    if (input.length === 0 || input.length > MAX_SOURCE_BYTES) throw new Error('Source image too large');

    const jpeg = await sharp(input)
      .rotate()
      .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'centre' })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 82, progressive: true, mozjpeg: true })
      .toBuffer();

    return new NextResponse(new Uint8Array(jpeg), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(jpeg.length),
        // Long edge cache — the URL changes (via ?v=) whenever the post does.
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    console.error(`[blog og] failed to render share image for "${slug}":`, err);
    return fallback();
  }
}
