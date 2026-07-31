import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const STATUSES = ['new', 'contacted', 'quoted', 'pending', 'closed'] as const;

/**
 * PATCH /api/admin/ghl/status
 * Body: { leadId: string, status: EnquiryStatus }
 *
 * GHL leads live in GoHighLevel, so their pipeline status is tracked here
 * against the synthetic lead id (see lib/ghl.ts).
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const leadId = typeof body?.leadId === 'string' ? body.leadId.trim() : '';
  const status = body?.status;

  if (!leadId || !STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid leadId or status' }, { status: 400 });
  }

  await prisma.ghlLeadStatus.upsert({
    where: { leadId },
    create: { leadId, status },
    update: { status },
  });

  return NextResponse.json({ success: true });
}
