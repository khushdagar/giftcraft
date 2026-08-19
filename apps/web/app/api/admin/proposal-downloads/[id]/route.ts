import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// Deck-download rows are a log, not a lead record — admins clear out test and
// duplicate entries from the Deck Downloads tab, so a delete is enough.
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    await prisma.proposalDownload.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting proposal download:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
