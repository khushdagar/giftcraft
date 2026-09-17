import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { SITE_URL } from '@/lib/site';

/**
 * GET /og/pack.jpg?src=<CDN image>&src=<CDN image>…  (1–4 sources)
 *
 * 1200×630 JPEG collage of a curated pack's member products, for og:image.
 *
 * A pack has no photo of its own — its page shows a collage tiled in the
 * browser from the member shots (components/product/pack-collage.tsx), so link
 * previews had nothing to show and fell back to the generic site card. This
 * renders the same bundle preview server-side.
 *
 * The member image URLs ARE the cache key: change a pack's products and its
 * og:image URL changes with them, so the long edge cache never goes stale.
 * Only our own CDN hosts are accepted so this can't be used as an image proxy.
 *
 * Deliberately NOT under /api: robots.txt disallows /api/ and Google's
 * fetchers honour it.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WIDTH = 1200;
const HEIGHT = 630;
const GAP = 6;
const MAX_TILES = 4;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
/** Gutter colour between tiles (gray-200). */
const GUTTER = '#E4E4E7';

function isShareableImageHost(hostname: string): boolean {
  return hostname === 'cdn.givoo.in' || hostname.endsWith('.digitaloceanspaces.com');
}

interface Cell {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Landscape tiling: 1 = full, 2 = halves, 3 = hero left + two stacked, 4 = 2×2. */
function layout(count: number): Cell[] {
  const halfW = Math.floor((WIDTH - GAP) / 2);
  const halfH = Math.floor((HEIGHT - GAP) / 2);
  const rightX = halfW + GAP;
  const rightW = WIDTH - rightX;
  const bottomY = halfH + GAP;
  const bottomH = HEIGHT - bottomY;
  if (count === 1) return [{ left: 0, top: 0, width: WIDTH, height: HEIGHT }];
  if (count === 2)
    return [
      { left: 0, top: 0, width: halfW, height: HEIGHT },
      { left: rightX, top: 0, width: rightW, height: HEIGHT },
    ];
  if (count === 3)
    return [
      { left: 0, top: 0, width: halfW, height: HEIGHT },
      { left: rightX, top: 0, width: rightW, height: halfH },
      { left: rightX, top: bottomY, width: rightW, height: bottomH },
    ];
  return [
    { left: 0, top: 0, width: halfW, height: halfH },
    { left: rightX, top: 0, width: rightW, height: halfH },
    { left: 0, top: bottomY, width: halfW, height: bottomH },
    { left: rightX, top: bottomY, width: rightW, height: bottomH },
  ];
}

type Rgb = { r: number; g: number; b: number };

/**
 * The photo's own backdrop colour, read from its top-left corner. Member shots
 * are square, the tiles are not — padding with the backdrop colour makes a
 * studio shot on blue fill its tile instead of sitting between white bars.
 */
async function backdropColour(flattened: Buffer): Promise<Rgb> {
  try {
    const { data } = await sharp(flattened)
      .resize(16, 16, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return { r: data[0] ?? 255, g: data[1] ?? 255, b: data[2] ?? 255 };
  } catch {
    return { r: 255, g: 255, b: 255 };
  }
}

/** A loaded member photo, normalised once so it can be fitted to any cell. */
interface Tile {
  image: Buffer;
  backdrop: Rgb;
}

function fitTile(tile: Tile, cell: Cell): Promise<Buffer> {
  // `contain` keeps the whole product visible; cropping a square cut-out to a
  // wide tile chops the product.
  return sharp(tile.image)
    .resize(cell.width, cell.height, { fit: 'contain', background: tile.backdrop })
    .png()
    .toBuffer();
}

async function fetchTile(src: string): Promise<Tile | null> {
  try {
    const res = await fetch(src, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    if (Number(res.headers.get('content-length') || 0) > MAX_SOURCE_BYTES) return null;
    const input = Buffer.from(await res.arrayBuffer());
    if (input.length === 0 || input.length > MAX_SOURCE_BYTES) return null;
    // Cap the working size — sources can be several thousand pixels wide.
    const image = await sharp(input)
      .rotate()
      .flatten({ background: '#ffffff' })
      .resize(WIDTH, WIDTH, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
    return { image, backdrop: await backdropColour(image) };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  // Canonical host, not req.url — behind App Platform's proxy that would be the
  // container's internal origin.
  const fallback = () => NextResponse.redirect(`${SITE_URL}/opengraph-image`, 302);

  const sources: string[] = [];
  for (const raw of req.nextUrl.searchParams.getAll('src')) {
    try {
      const url = new URL(raw);
      if (url.protocol === 'https:' && isShareableImageHost(url.hostname)) sources.push(url.toString());
    } catch {
      /* skip malformed */
    }
    if (sources.length === MAX_TILES) break;
  }
  if (sources.length === 0) return fallback();

  try {
    // Lay out for the images that actually loaded, so a dead URL never leaves a hole.
    const loaded = (await Promise.all(sources.map((src) => fetchTile(src)))).filter((t): t is Tile => !!t);
    if (loaded.length === 0) return fallback();

    const cells = layout(loaded.length);
    const tiles = await Promise.all(loaded.map((tile, i) => fitTile(tile, cells[i]!)));

    const jpeg = await sharp({
      create: { width: WIDTH, height: HEIGHT, channels: 3, background: GUTTER },
    })
      .composite(tiles.map((input, i) => ({ input, left: cells[i]!.left, top: cells[i]!.top })))
      .jpeg({ quality: 84, progressive: true, mozjpeg: true })
      .toBuffer();

    return new NextResponse(new Uint8Array(jpeg), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(jpeg.length),
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    console.error('[og pack] failed to render pack collage:', err);
    return fallback();
  }
}
