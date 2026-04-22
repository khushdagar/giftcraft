import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST() {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  return NextResponse.json(
    { error: 'Bulk upload coming in next phase' },
    { status: 501 }
  );
}
