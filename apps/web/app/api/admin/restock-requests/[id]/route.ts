import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const UpdateSchema = z.object({ notified: z.boolean() });

/** PATCH /api/admin/restock-requests/[id] — mark a restock request as notified. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { notified } = UpdateSchema.parse(await request.json());

  await prisma.restockRequest.update({
    where: { id: params.id },
    data: { notified },
  });

  return NextResponse.json({ success: true });
}
