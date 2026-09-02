import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { parsePageSeoBody } from '@/lib/page-seo-validation';

async function requireAdmin() {
  const session = await auth();
  return !!session && session.user.role === 'super_admin';
}

/** PUT /api/admin/page-seo/[id] — update one entry (the path itself may change). */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const existing = await prisma.pageSeo.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = parsePageSeoBody(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { path, ...data } = parsed.data;
  if (path !== existing.path) {
    const clash = await prisma.pageSeo.findUnique({ where: { path } });
    if (clash) {
      return NextResponse.json({ error: `${path} already has an SEO entry` }, { status: 409 });
    }
  }

  const saved = await prisma.pageSeo.update({
    where: { id: params.id },
    data: { path, ...data },
  });

  revalidatePath(saved.path);
  // If the entry moved to a different page, refresh the old one too so it
  // drops the override.
  if (existing.path !== saved.path) revalidatePath(existing.path);

  return NextResponse.json({ success: true, pageSeo: saved });
}

/** DELETE /api/admin/page-seo/[id] — the page goes back to its built-in tags. */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const existing = await prisma.pageSeo.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

  await prisma.pageSeo.delete({ where: { id: params.id } });
  revalidatePath(existing.path);

  return NextResponse.json({ success: true });
}
