import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// A saved pack stores only the configuration (products + variant picks +
// quantity) — never prices. Pricing is re-derived from live tiers on reorder,
// so a pack saved before a price change reorders at the current price.
const savedPackSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  packQuantity: z.number().int().min(1).max(100000),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variants: z
          .array(z.object({ kind: z.string().min(1), value: z.string().min(1) }))
          .optional(),
      })
    )
    .min(1, 'A pack needs at least one product')
    .max(50),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const packs = await prisma.savedPack.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                images: {
                  orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                  take: 1,
                  select: { url: true },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: packs });
  } catch (error) {
    console.error('GET /api/dashboard/saved-packs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    const parsed = savedPackSchema.parse(await request.json());

    // Duplicate product ids in one save would violate the unique constraint —
    // keep the first occurrence of each.
    const seen = new Set<string>();
    const items = parsed.items.filter((it) => {
      if (seen.has(it.productId)) return false;
      seen.add(it.productId);
      return true;
    });

    const created = await prisma.savedPack.create({
      data: {
        userId,
        name: parsed.name,
        packQuantity: parsed.packQuantity,
        items: {
          create: items.map((it, i) => ({
            productId: it.productId,
            sortOrder: i,
            variants: it.variants?.length ? it.variants : undefined,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    console.error('POST /api/dashboard/saved-packs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
