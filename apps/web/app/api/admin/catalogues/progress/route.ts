import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isProgressToken, readProgress } from '@/lib/catalogue-progress';

/**
 * GET /api/admin/catalogues/progress?token= — how far a PDF render has got
 * (super_admin). Polled by the builder's download bar.
 */

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const token = request.nextUrl.searchParams.get('token');
  if (!isProgressToken(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }
  return NextResponse.json(
    { progress: readProgress(token) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
