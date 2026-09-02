import { NextRequest, NextResponse } from 'next/server';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getS3Client, getBucketAndCdn } from '@/lib/upload-to-digital-ocean';

export const dynamic = 'force-dynamic';

export interface MediaLibraryEntry {
  url: string;
  altText: string | null;
  /** Where the image came from — the product name, or the blog post title. */
  productName: string | null;
  /** Object name in Spaces with the upload timestamp prefix stripped. */
  fileName: string;
}

/** Cached entry + a pre-built lowercase haystack the search runs against. */
type CachedEntry = MediaLibraryEntry & { searchText: string };

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

/** Pathname of a URL, decoded — the join key between Spaces objects and DB rows. */
function pathOf(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname);
  } catch {
    return url;
  }
}

const IMAGE_EXT = /\.(webp|jpe?g|png|gif|avif|svg)$/i;
// Responsive variants generated at upload time ("-640w.webp" etc.) — same
// picture, don't clutter the picker with them.
const VARIANT_SUFFIX = /-\d+w\.[a-z0-9]+$/i;

/**
 * The whole library: every image object in the Spaces bucket (newest first),
 * enriched with alt text / source name from ProductImage and BlogPost rows
 * where the file is attached to one. Listing the bucket + loading the metadata
 * maps is expensive, so the result is cached across requests (see the Aug 2026
 * outage note — whole-catalogue loaders must never run per render).
 */
let cache: { at: number; items: CachedEntry[] } | null = null;
const CACHE_TTL_MS = 60_000;

async function loadLibrary(): Promise<CachedEntry[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.items;

  const client = getS3Client();
  const { bucket, cdnEndpoint } = getBucketAndCdn();

  const objects: { key: string; lastModified: number }[] = [];
  let token: string | undefined;
  do {
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token })
    );
    for (const obj of res.Contents ?? []) {
      if (!obj.Key || !IMAGE_EXT.test(obj.Key) || VARIANT_SUFFIX.test(obj.Key)) continue;
      objects.push({ key: obj.Key, lastModified: obj.LastModified?.getTime() ?? 0 });
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  objects.sort((a, b) => b.lastModified - a.lastModified);

  const [images, posts] = await Promise.all([
    prisma.productImage.findMany({
      select: { url: true, altText: true, product: { select: { name: true, sku: true } } },
    }),
    prisma.blogPost.findMany({
      where: { OR: [{ coverImageUrl: { not: null } }, { ogImageUrl: { not: null } }] },
      select: { title: true, coverImageUrl: true, coverImageAlt: true, ogImageUrl: true },
    }),
  ]);

  // Keyed by decoded pathname so it matches regardless of CDN host (cdn.givoo.in
  // vs the raw bucket endpoint) or percent-encoding differences.
  const meta = new Map<string, { altText: string | null; productName: string | null; extra: string }>();
  for (const img of images) {
    meta.set(pathOf(img.url), {
      altText: img.altText,
      productName: img.product?.name ?? null,
      extra: img.product?.sku ?? '',
    });
  }
  for (const p of posts) {
    for (const url of [p.coverImageUrl, p.ogImageUrl]) {
      if (!url) continue;
      const key = pathOf(url);
      if (!meta.has(key)) meta.set(key, { altText: p.coverImageAlt, productName: p.title, extra: '' });
    }
  }

  const items: CachedEntry[] = objects.map(({ key }) => {
    const url = `${cdnEndpoint}/${key.split('/').map(encodeURIComponent).join('/')}`;
    const m = meta.get(`/${key}`);
    const fileName = fileNameOf(url);
    return {
      url,
      altText: m?.altText ?? null,
      productName: m?.productName ?? null,
      fileName,
      searchText: [fileName, key, m?.productName, m?.altText, m?.extra]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    };
  });

  cache = { at: Date.now(), items };
  return items;
}

/**
 * GET /api/admin/products/media-library?search=&limit=&offset=
 * Everything in the Spaces bucket — so category covers, occasion images and any
 * other upload show up too, not just product/blog images. Searchable by file
 * name, product name, SKU, blog title or alt text; spaces in the query also
 * match the hyphens file names use. Paginated: returns `hasMore` for infinite
 * scroll.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);

    const all = await loadLibrary();

    let filtered = all;
    if (search) {
      // File names are hyphen-separated ("Corrugated-box.webp"), so a query
      // typed with spaces must still hit. Every word has to match somewhere.
      const terms = search.split(/\s+/).filter(Boolean);
      filtered = all.filter((m) =>
        terms.every((t) => m.searchText.includes(t) || m.searchText.includes(t.replace(/-/g, ' ')))
      );
    }

    const page = filtered.slice(offset, offset + limit).map(({ searchText: _s, ...entry }) => entry);

    return NextResponse.json({
      success: true,
      media: page,
      total: filtered.length,
      hasMore: offset + page.length < filtered.length,
    });
  } catch (error) {
    console.error('Error loading media library:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load media' },
      { status: 500 }
    );
  }
}
