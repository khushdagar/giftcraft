import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getBucketAndCdn } from '@/lib/upload-to-digital-ocean';
import { PACK_IMAGE_FOLDER } from '@/lib/proposal-pack';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/generated-images/download?url=&name=
 * Streams an AI pack image back as a file download. Only our own generated
 * images are accepted — never an arbitrary URL.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return new Response('Unauthorized', { status: 403 });
  }

  const url = req.nextUrl.searchParams.get('url') || '';
  const { cdnEndpoint } = getBucketAndCdn();
  if (!url.startsWith(`${cdnEndpoint}/${PACK_IMAGE_FOLDER}/`)) {
    return new Response('Invalid image', { status: 400 });
  }

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok || !res.body) return new Response('Image not found', { status: 404 });

  const slug =
    (req.nextUrl.searchParams.get('name') || 'pack')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'pack';

  return new Response(res.body, {
    status: 200,
    headers: {
      'Content-Type': res.headers.get('content-type') || 'image/jpeg',
      'Content-Disposition': `attachment; filename="givoo-${slug}.jpg"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
