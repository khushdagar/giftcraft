import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/redirects/export
 * Every rule as a CSV in the same shape the importer reads, so the SEO team can
 * audit the list in a sheet and upload a corrected version straight back.
 */
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const rows = await prisma.urlRedirect.findMany({ orderBy: { source: 'asc' } });

  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = [
    ['Old URL', 'New URL', 'Type', 'Note', 'Live'].join(','),
    ...rows.map((r) =>
      [r.source, r.destination, String(r.statusCode), r.note ?? '', r.isActive ? 'yes' : 'no']
        .map(cell)
        .join(',')
    ),
  ].join('\n');

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="givoo-redirects.csv"',
    },
  });
}
