import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { fetchGhlLeads } from '@/lib/ghl';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Pull leads live from GoHighLevel for the admin Enquiries tab. Nothing is
 * stored — GHL stays the source of truth; admins use these rows to create
 * proposals. See lib/ghl.ts for how leads are assembled.
 */
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const result = await fetchGhlLeads();

  if (result.status === 'not_configured') {
    return NextResponse.json({ success: false, error: 'not_configured' });
  }

  if (result.status === 'error') {
    return NextResponse.json({ success: false, error: result.error }, { status: 502 });
  }

  // Pipeline status is ours, not GHL's — merge it in by lead id.
  const statusRows = await prisma.ghlLeadStatus.findMany({
    where: { leadId: { in: result.leads.map((l) => l.id) } },
    select: { leadId: true, status: true },
  });
  const statusByLead = new Map(statusRows.map((r) => [r.leadId, r.status]));

  return NextResponse.json({
    success: true,
    data: result.leads.map((l) => ({ ...l, status: statusByLead.get(l.id) ?? 'new' })),
    missingScopes: result.missingScopes,
  });
}
