import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { parsePageSeoBody } from '@/lib/page-seo-validation';

/**
 * POST /api/admin/page-seo — add or update the SEO override for one page
 * (super_admin only). Saving a path that already has an entry overwrites it.
 * The page is revalidated straight away, so the new tags are live without a
 * deploy.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = parsePageSeoBody(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { path, ...data } = parsed.data;
  const saved = await prisma.pageSeo.upsert({
    where: { path },
    create: { path, ...data },
    update: data,
  });

  revalidatePath(path);

  return NextResponse.json({ success: true, pageSeo: saved });
}
