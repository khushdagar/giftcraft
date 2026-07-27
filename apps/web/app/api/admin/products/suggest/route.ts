import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/products/suggest?q=bottle
 * Lightweight autocomplete for the products search box — matches name or SKU
 * and returns a small, flat result set with the primary image.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const q = (new URL(request.url).searchParams.get('q') || '').trim();
  if (q.length < 1) return NextResponse.json({ results: [] });

  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      name: true,
      sku: true,
      status: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });

  const results = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    status: p.status,
    image: p.images[0]?.url || null,
  }));

  return NextResponse.json({ results });
}
