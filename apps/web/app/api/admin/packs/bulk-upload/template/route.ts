import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { buildPackCsv } from '@/lib/pack-csv';

/**
 * GET /api/admin/packs/bulk-upload/template
 * Downloads a blank curated-pack CSV template (headers + one example row).
 * The example's `products` cell is filled with real SKUs from the catalogue
 * when there are any, so the downloaded file imports as-is.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const [products, occasion] = await Promise.all([
      prisma.product.findMany({
        where: { isPack: false, status: 'active' },
        select: { sku: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
      // `isCollection` entries are the homepage's curated tiles, not occasions.
      prisma.occasionConfig.findFirst({
        where: { isActive: true, isCollection: false },
        select: { name: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    const skus = products.map((p) => p.sku);
    const productsCell = skus.length
      ? skus.map((s, i) => (i === 0 ? `${s} x2` : s)).join(', ')
      : 'DRIN-Insula-4 x2, NOTE-A5-1, PEN-Metal-2';

    const example: Record<string, string> = {
      name: 'Welcome Kit — Essentials',
      slug: '',
      sku: '',
      status: 'active',
      isFeatured: 'no',
      sortOrder: '1',
      products: productsCell,
      category: 'Gift Packs',
      // Where the pack surfaces on the storefront. Comma-separate for several;
      // an occasion that doesn't exist yet is created from this cell. The
      // budget band comes from the members' prices — there is no column for it.
      occasions: occasion?.name || 'Onboarding',
      tags: 'welcome, onboarding',
      recipientTags: 'New joiners',
      descriptionShort: 'A ready-to-ship welcome bundle for new joiners.',
      descriptionLong: 'Everything a new joiner needs on day one, branded and boxed together.',
      keyFeatures: 'Ships as one branded box; Fully customisable in the builder',
      specifications: '',
      shippingDelivery: 'Dispatched in 10-12 working days after artwork approval.',
      metaTitle: 'Welcome Kit — Essentials | Corporate Onboarding Gifts',
      metaDescription:
        'A ready-to-ship branded welcome bundle for new joiners — bulk pricing, custom logo printing and pan-India delivery.',
      imageUrls: '',
    };

    const csv = buildPackCsv([example]);

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="givoo-packs-template.csv"',
      },
    });
  } catch (error) {
    console.error('Error generating pack CSV template:', error);
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}
