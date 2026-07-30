import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

const GHL_BASE = 'https://services.leadconnectorhq.com';

/**
 * Pull leads (contacts) live from the GoHighLevel API. Nothing is stored —
 * GHL stays the source of truth; admins use these rows to create proposals.
 * Requires GHL_API_KEY (Private Integration token) and GHL_LOCATION_ID.
 */
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!apiKey || !locationId) {
    return NextResponse.json({ success: false, error: 'not_configured' });
  }

  try {
    const res = await fetch(
      `${GHL_BASE}/contacts/?locationId=${encodeURIComponent(locationId)}&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: '2021-07-28',
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error('GHL contacts fetch failed:', res.status, text);
      return NextResponse.json(
        { success: false, error: `GoHighLevel API error (${res.status})` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const leads = (data.contacts || []).map((c: any) => ({
      id: c.id,
      name:
        c.contactName ||
        [c.firstName, c.lastName].filter(Boolean).join(' ') ||
        null,
      email: c.email || null,
      phone: c.phone || null,
      companyName: c.companyName || null,
      tags: Array.isArray(c.tags) ? c.tags : [],
      dateAdded: c.dateAdded || null,
    }));

    return NextResponse.json({ success: true, data: leads });
  } catch (error) {
    console.error('GHL leads error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reach GoHighLevel' },
      { status: 502 }
    );
  }
}
