import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { orderScopeWhere } from '@/lib/order-access';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Every order the buyer's company placed — so a buyer who checked out under
    // a second email still finds their history here.
    const scope = orderScopeWhere(session.user);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: scope,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          grandTotal: true,
          createdAt: true,
          packQuantity: true,
          items: {
            select: {
              id: true,
              productId: true,
              quantity: true,
              unitPrice: true,
              variantsJson: true,
              product: {
                select: {
                  name: true,
                  images: {
                    select: {
                      url: true,
                    },
                    orderBy: { sortOrder: 'asc' },
                    take: 1,
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where: scope }),
    ]);

    return NextResponse.json(
      {
        success: true,
        orders: orders.map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          grandTotal: Number(o.grandTotal),
          createdAt: o.createdAt.toISOString(),
          itemCount: o.packQuantity,
          items: o.items.map((it: any) => ({
            id: it.id,
            productId: it.productId,
            name: it.product?.name || 'Product',
            quantity: it.quantity,
            unitPrice: Number(it.unitPrice),
            variants: it.variantsJson,
            image: it.product?.images?.[0]?.url || null,
          })),
        })),
        total,
        page,
        limit,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Error fetching orders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
