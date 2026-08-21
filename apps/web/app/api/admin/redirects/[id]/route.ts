import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  normalizeDestination,
  normalizeSource,
  parseStatus,
  validateRule,
} from '@/lib/redirects';
import { findChain } from '@/lib/redirect-chain';

async function guard() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  return null;
}

/** PATCH /api/admin/redirects/[id] — edit a rule, or switch it on/off. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await guard();
  if (denied) return denied;

  const existing = await prisma.urlRedirect.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'Redirect not found' }, { status: 404 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // A toggle-only request skips validation — the rule was already valid.
  const isToggleOnly =
    Object.keys(body).length === 1 && Object.prototype.hasOwnProperty.call(body, 'isActive');
  if (isToggleOnly) {
    const updated = await prisma.urlRedirect.update({
      where: { id: params.id },
      data: { isActive: !!body.isActive },
    });
    return NextResponse.json({ success: true, redirect: updated });
  }

  const source = body.source === undefined ? existing.source : normalizeSource(body.source);
  const status =
    body.statusCode === undefined && body.type === undefined
      ? (existing.statusCode as 301 | 302 | 410)
      : parseStatus(body.statusCode ?? body.type);
  if (status === null) {
    return NextResponse.json({ error: 'Type must be 301, 302 or 410' }, { status: 400 });
  }
  const destination =
    status === 410
      ? ''
      : normalizeDestination(body.destination === undefined ? existing.destination : body.destination);

  const problem = validateRule(source, destination, status);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  if (source !== existing.source || destination !== existing.destination) {
    const chained = await findChain(source, destination);
    if (chained) return NextResponse.json({ error: chained }, { status: 400 });
  }

  // The old URL is the unique key, so renaming it must not collide.
  if (source !== existing.source) {
    const clash = await prisma.urlRedirect.findUnique({ where: { source } });
    if (clash) {
      return NextResponse.json(
        { error: `${source} already has a redirect — edit that row instead` },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.urlRedirect.update({
    where: { id: params.id },
    data: {
      source,
      destination,
      statusCode: status,
      isActive: body.isActive === undefined ? existing.isActive : !!body.isActive,
      note: body.note === undefined ? existing.note : (body.note ?? '').toString().trim() || null,
    },
  });

  return NextResponse.json({ success: true, redirect: updated });
}

/** DELETE /api/admin/redirects/[id] — the old URL goes back to serving a 404. */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await guard();
  if (denied) return denied;

  try {
    await prisma.urlRedirect.delete({ where: { id: params.id } });
  } catch {
    return NextResponse.json({ error: 'Redirect not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
