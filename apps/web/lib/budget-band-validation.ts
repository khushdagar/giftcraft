import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slug';

// Shared by both budget-band route handlers. It lives here rather than in the
// POST route because a Next.js route file may only export handlers.

export const BudgetBandSchema = z
  .object({
    name: z.string().min(1, 'Name required'),
    slug: z.string().min(1, 'Slug required').transform(slugify),
    description: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    gradient: z.string().optional().nullable(),
    minPrice: z.number().int().min(0, 'Minimum cannot be negative'),
    // Null means "and above" — the top of the ladder.
    maxPrice: z.number().int().positive().optional().nullable(),
    metaTitle: z.string().optional().nullable(),
    metaDescription: z.string().optional().nullable(),
    contentBelow: z.string().optional().nullable(),
    faqs: z
      .array(z.object({ question: z.string(), answer: z.string() }))
      .optional()
      .nullable(),
    sortOrder: z.number().int().default(0),
    isActive: z.boolean().default(true),
  })
  .refine((d) => d.maxPrice == null || d.maxPrice > d.minPrice, {
    message: 'Maximum must be greater than minimum',
    path: ['maxPrice'],
  });

/**
 * Bands must not overlap: a pack belongs to exactly one, so two bands covering
 * the same rupee would show it twice. Checked here rather than in the database,
 * where a range constraint would be far harder to explain when it fires.
 */
export async function assertNoOverlap(
  data: { minPrice: number; maxPrice?: number | null },
  excludeId?: string
) {
  const others = await prisma.budgetBand.findMany({
    where: excludeId ? { id: { not: excludeId } } : {},
    select: { name: true, minPrice: true, maxPrice: true },
  });
  const aMax = data.maxPrice ?? Number.POSITIVE_INFINITY;
  const clash = others.find((o) => {
    const bMax = o.maxPrice ?? Number.POSITIVE_INFINITY;
    return data.minPrice < bMax && o.minPrice < aMax;
  });
  return clash
    ? `This range overlaps “${clash.name}” (₹${clash.minPrice}–${clash.maxPrice ?? '∞'}). Bands must not overlap.`
    : null;
}
