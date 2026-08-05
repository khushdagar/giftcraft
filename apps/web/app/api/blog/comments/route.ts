import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { zEmail, zPersonName } from '@/lib/zod-fields';
import { sendPushToAdmins } from '@/lib/push';

export const dynamic = 'force-dynamic';

const CommentSchema = z.object({
  postId: z.string().min(1),
  authorName: zPersonName('Your name').max(60),
  email: zEmail.max(120),
  body: z.string().trim().min(4, 'Comment is too short').max(2000),
  // Honeypot — real people never fill a field they cannot see.
  website: z.string().max(0).optional(),
});

/** Approved comments for one post, oldest first so a thread reads top to bottom. */
export async function GET(req: NextRequest) {
  const postId = req.nextUrl.searchParams.get('postId');
  if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 });

  const comments = await prisma.blogComment.findMany({
    where: { postId, status: 'approved' },
    // Email is deliberately excluded — it must never reach the browser.
    select: { id: true, authorName: true, body: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  return NextResponse.json({ success: true, data: comments });
}

/** Anyone may comment; nothing is visible until a super_admin approves it. */
export async function POST(req: NextRequest) {
  try {
    const input = CommentSchema.parse(await req.json());

    // Silently accept honeypot hits so bots don't learn to work around it.
    if (input.website) return NextResponse.json({ success: true, data: { status: 'pending' } });

    const post = await prisma.blogPost.findFirst({
      where: { id: input.postId, status: 'published' },
      select: { id: true },
    });
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    // One identical comment per post is plenty — catches double submits and floods.
    const duplicate = await prisma.blogComment.findFirst({
      where: { postId: post.id, email: input.email, body: input.body },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json({ error: 'You have already posted that comment.' }, { status: 409 });
    }

    const comment = await prisma.blogComment.create({
      data: {
        postId: post.id,
        authorName: input.authorName,
        email: input.email,
        body: input.body,
      },
      select: { id: true, post: { select: { title: true } } },
    });

    // Comments stay invisible until moderated, so nudge the admin.
    sendPushToAdmins({
      title: `New comment by ${input.authorName}`,
      body: `on "${comment.post.title}" — awaiting moderation.`,
      url: '/admin/blog/comments',
      tag: `comment-${comment.id}`,
    }).catch(() => {});

    return NextResponse.json({ success: true, data: { status: 'pending' } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors.map((e) => e.message).join(', ') }, { status: 400 });
    }
    console.error('Failed to create blog comment:', error);
    return NextResponse.json({ error: 'Could not post your comment' }, { status: 500 });
  }
}
