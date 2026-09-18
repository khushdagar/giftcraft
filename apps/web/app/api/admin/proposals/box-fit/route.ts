import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { resolveBoxFit } from '@/lib/box-fit';
import { PACK_IMAGE_MAX_PRODUCTS } from '@/lib/pack-image-service';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  productIds: z.array(z.string()).max(PACK_IMAGE_MAX_PRODUCTS),
  boxId: z.string().max(120),
});

/**
 * POST /api/admin/proposals/box-fit
 * The box size a pack needs and the products that cannot go in that box —
 * the same check the AI pack image uses, so the builder's size, price and
 * warning always match what the image will show.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { productIds, boxId } = bodySchema.parse(await req.json());
    const fit = await resolveBoxFit(productIds, boxId);
    return NextResponse.json({ success: true, data: { size: fit.size, outside: fit.outside } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Invalid input' }, { status: 400 });
    }
    console.error('Box fit error:', error);
    return NextResponse.json({ success: false, error: 'Failed to check box fit' }, { status: 500 });
  }
}
