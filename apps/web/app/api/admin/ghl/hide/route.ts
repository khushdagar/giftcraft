import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/ghl/hide
 * Body: { leadIds: string[], hidden: boolean }
 *
 * Hides (or restores) GHL leads in the admin Enquiries table. GoHighLevel is
 * the source of truth for the contacts themselves — nothing is deleted there.
 * We only flag the synthetic lead id on our side, so hiding is always
 * reversible via the "Show hidden" toggle.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const leadIds: string[] = Array.isArray(body?.leadIds)
    ? body.leadIds.filter((id: unknown): id is string => typeof id === 'string' && !!id.trim())
    : [];
  const hidden = body?.hidden !== false; // default to hiding

  if (leadIds.length === 0) {
    return NextResponse.json({ error: 'No leadIds provided' }, { status: 400 });
  }

  // A lead may have no status row yet (never touched), so upsert rather than
  // update — otherwise hiding an untouched lead would silently do nothing.
  await prisma.$transaction(
    leadIds.map((leadId) =>
      prisma.ghlLeadStatus.upsert({
        where: { leadId },
        create: { leadId, hidden },
        update: { hidden },
      })
    )
  );

  return NextResponse.json({ success: true, count: leadIds.length });
}
