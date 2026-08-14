import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Popularity counter. The detail pages POST here once per browser session (the
 * caller dedupes via sessionStorage) and listings order by the resulting
 * `viewCount` as a tie-breaker under `sortOrder`.
 *
 * Deliberately forgiving: a view is telemetry, never something a visitor should
 * see fail. Bad input and DB errors both return 200 so the beacon can be sent
 * fire-and-forget from the client.
 */
const ViewSchema = z.object({
  type: z.enum(['product', 'occasion']),
  id: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = ViewSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false });

    const { type, id } = parsed.data;
    // Packs are Products (isPack=true), so the product branch covers them too.
    if (type === 'product') {
      await prisma.product.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
    } else {
      await prisma.occasionConfig.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Deleted record, transient DB blip — nothing the visitor can act on.
    return NextResponse.json({ ok: false });
  }
}
