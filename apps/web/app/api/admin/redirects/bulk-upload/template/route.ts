import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * GET /api/admin/redirects/bulk-upload/template
 * A blank redirect sheet with the headings the importer expects and three
 * worked example rows (an exact move, a whole-folder move, and a page that is
 * gone for good). Opens straight in Excel or Google Sheets.
 */
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const rows = [
    ['Old URL', 'New URL', 'Type', 'Note'],
    ['/old-corporate-gifts', '/catalog', '301', 'GSC 404 report, Aug 2026'],
    ['/blog/*', '/insights/*', '301', 'Whole blog folder moved'],
    ['/christmas-2024-offer', '', '410', 'Campaign over — page removed on purpose'],
  ];

  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = rows.map((r) => r.map(cell).join(',')).join('\n');

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="givoo-redirects-template.csv"',
    },
  });
}
