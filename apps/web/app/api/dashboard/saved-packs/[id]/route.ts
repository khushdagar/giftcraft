import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    packQuantity: z.number().int().min(1).max(100000).optional(),
  })
  .refine((v) => v.name !== undefined || v.packQuantity !== undefined, {
    message: 'Nothing to update',
  });

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = updateSchema.parse(await request.json());

    // Ownership is part of the where clause, so one user can never touch
    // another user's pack — a miss and a foreign id both come back count 0.
    const result = await prisma.savedPack.updateMany({
      where: { id: params.id, userId: session.user.id },
      data: parsed,
    });
    if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    console.error('PATCH /api/dashboard/saved-packs/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await prisma.savedPack.deleteMany({
      where: { id: params.id, userId: session.user.id },
    });
    if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/dashboard/saved-packs/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
