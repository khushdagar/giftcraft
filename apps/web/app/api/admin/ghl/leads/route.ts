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

  // Pipeline status and the hidden flag are ours, not GHL's — merge by lead id.
  const statusRows = await prisma.ghlLeadStatus.findMany({
    where: { leadId: { in: result.leads.map((l) => l.id) } },
    select: { leadId: true, status: true, hidden: true },
  });
  const rowByLead = new Map(statusRows.map((r) => [r.leadId, r]));

  return NextResponse.json({
    success: true,
    // Hidden leads are still returned (flagged) so the table can offer a
    // "Show hidden" toggle without another round trip to GHL.
    data: result.leads.map((l) => ({
      ...l,
      status: rowByLead.get(l.id)?.status ?? 'new',
      hidden: rowByLead.get(l.id)?.hidden ?? false,
    })),
    missingScopes: result.missingScopes,
  });
}
