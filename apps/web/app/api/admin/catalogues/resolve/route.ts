import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { catalogueSectionBaseSchema, pagesFor, paginate } from '@/lib/catalogue';
import { resolveSections } from '@/lib/catalogue-render';

/**
 * POST /api/admin/catalogues/resolve
 *
 * Live preview for the builder: runs the SAME resolver the PDF uses over the
 * unsaved section definitions and returns, per section, the products that
 * would print and the page count. Nothing is persisted.
 */

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  priceMode: z.enum(['starting', 'base', 'hidden']).default('starting'),
  sections: z.array(catalogueSectionBaseSchema).max(30),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const { sections, priceMode } = parsed.data;

    const resolved = await resolveSections(sections, { priceMode });
    const printed = resolved.filter((s) => s.products.length > 0);
    const { total } = paginate(printed.map((s) => ({ count: s.products.length })));

    return NextResponse.json({
      sections: resolved.map((s) => ({
        title: s.title,
        count: s.products.length,
        pages: pagesFor(s.products.length),
        products: s.products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          imageUrl: p.imageUrl,
          price: p.price ? `${p.pricePrefix}${p.price}` : null,
          badge: p.badge,
        })),
      })),
      totalProducts: printed.reduce((n, s) => n + s.products.length, 0),
      // `total` is the closing page's number, i.e. the page count of the PDF.
      totalPages: printed.length > 0 ? total : 0,
    });
  } catch (error) {
    console.error('Error resolving catalogue preview:', error);
    return NextResponse.json({ error: 'Failed to build preview' }, { status: 500 });
  }
}
