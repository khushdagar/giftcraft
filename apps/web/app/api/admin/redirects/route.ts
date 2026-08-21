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

/**
 * POST /api/admin/redirects — add or update one redirect (super_admin only).
 *
 * Saving an old URL that already has a rule overwrites it, so re-submitting a
 * corrected destination is the normal way to fix a mistake.
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

  const source = normalizeSource(body?.source);
  const status = parseStatus(body?.statusCode ?? body?.type);
  if (status === null) {
    return NextResponse.json({ error: 'Type must be 301, 302 or 410' }, { status: 400 });
  }
  const destination = status === 410 ? '' : normalizeDestination(body?.destination);

  const problem = validateRule(source, destination, status);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  // Chain guard. Two hops lose ranking signal and Google reports them as
  // redirect chains, so point the new rule straight at the final page instead.
  const chained = await findChain(source, destination);
  if (chained) return NextResponse.json({ error: chained }, { status: 400 });

  const data = {
    destination,
    statusCode: status,
    isActive: body?.isActive === undefined ? true : !!body.isActive,
    note: (body?.note ?? '').toString().trim() || null,
  };

  const saved = await prisma.urlRedirect.upsert({
    where: { source },
    create: { source, ...data },
    update: data,
  });

  return NextResponse.json({ success: true, redirect: saved });
}
