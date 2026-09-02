import { z } from 'zod';
import type { BlogAuthor } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BLOG_AUTHOR } from '@/lib/blog';

/**
 * Blog author entities, managed in /admin/blog/authors. Each gets a profile
 * page at /blog/author/[slug] whose Person node is what every post's
 * BlogPosting.author @id points at. Server-only (touches Prisma) — client
 * components receive authors as props.
 */

/** Canonical path of an author's profile page. */
export function authorPagePath(slug: string): string {
  return `/blog/author/${slug}`;
}

/** Validation for the admin author create/update endpoints. */
export const AuthorInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  slug: z.string().max(80).optional().nullable(),
  role: z.string().min(1, 'Role is required').max(120),
  summary: z.string().max(500).default(''),
  bio: z.array(z.string().max(2000)).default([]),
  credentials: z.array(z.string().max(300)).default([]),
  knowsAbout: z.array(z.string().max(100)).default([]),
  sameAs: z.array(z.string().url('Profile links must be full URLs')).default([]),
});

/**
 * The founder profile every historical byline belongs to — seeded as the
 * first row the first time authors are read, so posts written before authors
 * were manageable still resolve to a real entity.
 */
const FOUNDER_SEED = {
  name: BLOG_AUTHOR,
  slug: 'mayank-jain',
  role: 'Founder, GIVOO by Arts Shala',
  summary:
    'Mayank Jain is the founder of GIVOO by Arts Shala, a New Delhi-based bulk corporate gifting platform, and writes its guides on gifting budgets, branding, GST and delivery.',
  bio: [
    'Mayank Jain is the founder of GIVOO, India’s first self-serve bulk corporate gifting platform, built by Arts Shala in New Delhi.',
    'He works with HR, admin and marketing teams across India on bulk gifting programmes — festive hampers, onboarding kits and event giveaways — and built GIVOO so companies get transparent per-unit pricing, branded packaging and mockup approvals without waiting on a sales rep.',
    'On the GIVOO blog he writes practical, experience-based guides on corporate gifting: planning budgets, choosing products, branding and packaging options, GST on gifts, and delivery timelines for bulk orders.',
  ],
  credentials: [
    'Founder of Arts Shala, the Delhi-based gifting company behind GIVOO',
    'Runs bulk corporate gifting programmes end to end — sourcing, branding, quality checks and delivery',
    'Author of GIVOO’s guides on gifting budgets, GST compliance and gift branding',
  ],
  knowsAbout: ['Corporate gifting', 'Bulk gift sourcing', 'Gift branding and packaging', 'GST on corporate gifts'],
  sameAs: [] as string[],
};

/** All authors, oldest first. The first row is the default byline. */
export async function getAuthors(): Promise<BlogAuthor[]> {
  const authors = await prisma.blogAuthor.findMany({ orderBy: { createdAt: 'asc' } });
  if (authors.length > 0) return authors;
  const seeded = await prisma.blogAuthor.upsert({
    where: { slug: FOUNDER_SEED.slug },
    update: {},
    create: FOUNDER_SEED,
  });
  return [seeded];
}

/** The default byline — the oldest author row. */
export async function getDefaultAuthor(): Promise<BlogAuthor> {
  return (await getAuthors())[0]!;
}

export async function getAuthorBySlug(slug: string): Promise<BlogAuthor | null> {
  return (await getAuthors()).find((a) => a.slug === slug) ?? null;
}

/** Profile for a byline name — a null/empty name means the default author. */
export async function getAuthorByName(name?: string | null): Promise<BlogAuthor | null> {
  const authors = await getAuthors();
  if (!name) return authors[0]!;
  return authors.find((a) => a.name === name) ?? null;
}
