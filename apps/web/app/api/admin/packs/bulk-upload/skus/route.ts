import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/packs/bulk-upload/skus
 * Downloads a reference CSV of every non-pack product — sku, name, category and
 * base price — so the admin can copy exact SKUs into the pack sheet's
 * `products` column instead of guessing them.
 */
const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const products = await prisma.product.findMany({
      where: { isPack: false },
      select: {
        sku: true,
        name: true,
        status: true,
        categories: { select: { category: { select: { name: true } } }, take: 1 },
        priceTiers: { where: { tier: 1 }, select: { sellPrice: true }, take: 1 },
      },
      orderBy: { name: 'asc' },
    });

    const lines = [
      'sku,name,category,status,tier1SellPrice',
      ...products.map((p) =>
        [
          p.sku,
          p.name,
          p.categories[0]?.category.name ?? '',
          p.status,
          p.priceTiers[0] ? String(p.priceTiers[0].sellPrice) : '',
        ]
          .map((v) => cell(v ?? ''))
          .join(',')
      ),
    ];

    return new Response(lines.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="givoo-product-skus.csv"',
      },
    });
  } catch (error) {
    console.error('Error generating SKU reference:', error);
    return NextResponse.json({ error: 'Failed to generate SKU list' }, { status: 500 });
  }
}
