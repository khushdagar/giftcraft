import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const PatchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['pending', 'approved', 'rejected']),
});

async function requireAdmin() {
  const session = await auth();
  return Boolean(session && session.user.role === 'super_admin');
}

/** Moderation queue. `?status=` filters; omit it for everything. */
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get('status');
  const comments = await prisma.blogComment.findMany({
    where: status ? { status: status as 'pending' | 'approved' | 'rejected' } : {},
    include: { post: { select: { title: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return NextResponse.json({ success: true, data: comments });
}

/** Approve or reject a comment. Approving is what makes it public. */
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { id, status } = PatchSchema.parse(await req.json());
    const comment = await prisma.blogComment.update({
      where: { id },
      data: { status, approvedAt: status === 'approved' ? new Date() : null },
      select: { id: true, status: true },
    });
    return NextResponse.json({ success: true, data: comment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors.map((e) => e.message).join(', ') }, { status: 400 });
    }
    console.error('Failed to moderate blog comment:', error);
    return NextResponse.json({ error: 'Could not update comment' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing comment id' }, { status: 400 });

  try {
    await prisma.blogComment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete blog comment:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
