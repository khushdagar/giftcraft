import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { SITE_URL } from '@/lib/site';

/**
 * GET /og/share.jpg?src=<absolute CDN image URL>
 *
 * 1200×630 JPEG rendition of any catalogue image, for og:image / twitter:image.
 *
 * Every upload is stored as WebP, and most link unfurlers — WhatsApp, Google
 * Chat, LinkedIn, Facebook — silently drop a WebP og:image, so cards rendered
 * without a picture even though the tags were present. Same trick as
 * /blog/[slug]/og.jpg, generalised: withPageSeo() rewrites every CDN og:image
 * to this route. Only our own CDN hosts are accepted so this can't be used as
 * an open image proxy.
 *
 * Deliberately NOT under /api: robots.txt disallows /api/ and Google's
 * fetchers honour it.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WIDTH = 1200;
const HEIGHT = 630;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

function isShareableImageHost(hostname: string): boolean {
  return hostname === 'cdn.givoo.in' || hostname.endsWith('.digitaloceanspaces.com');
}

export async function GET(req: NextRequest) {
  // Canonical host, not req.url — behind App Platform's proxy that would be the
  // container's internal origin.
  const fallback = () => NextResponse.redirect(`${SITE_URL}/opengraph-image`, 302);

  const src = req.nextUrl.searchParams.get('src');
  if (!src) return fallback();

  let source: URL;
  try {
    source = new URL(src);
  } catch {
    return fallback();
  }
  if (source.protocol !== 'https:' || !isShareableImageHost(source.hostname)) return fallback();

  try {
    const res = await fetch(source.toString(), { cache: 'no-store', signal: AbortSignal.timeout(8000) });
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
        // Long edge cache — upload URLs are unique per file, so a replaced
        // image gets a new src and therefore a new share URL.
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    console.error(`[og share] failed to render share image for "${src}":`, err);
    return fallback();
  }
}
