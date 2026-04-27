import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const RecommendationsSchema = z.object({
  budget: z.coerce.number().positive().max(1000000),
  occasion: z.string().min(1).max(50),
  qty: z.coerce.number().positive().int().default(1),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const budget = searchParams.get('budget');
    const occasion = searchParams.get('occasion');
    const qty = searchParams.get('qty');

    const validation = RecommendationsSchema.safeParse({
      budget: budget ? parseFloat(budget) : 10000,
      occasion: occasion || 'corporate',
      qty: qty ? parseInt(qty) : 1,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { budget: totalBudget, qty: quantity } = validation.data;
    const pricePerUnit = totalBudget / quantity;

    // Find products that fit the budget (with 10% margin)
    const products = await prisma.product.findMany({
      where: {
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        descriptionShort: true,
        priceTiers: {
          where: {
            tier: { lte: 6 },
          },
          select: {
            tier: true,
            minQty: true,
            maxQty: true,
            sellPrice: true,
          },
          orderBy: { tier: 'asc' },
          take: 1,
        },
        images: {
          select: { url: true },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
      take: 20,
    });

    // Filter and sort by price match
    const recommendations = products
      .filter((p) => p.priceTiers.length > 0 && Number(p.priceTiers[0]!.sellPrice) <= pricePerUnit * 1.1)
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.descriptionShort || p.name,
        price: Number(p.priceTiers[0]!.sellPrice),
        image: p.images[0]?.url,
        totalForQty: Number(p.priceTiers[0]!.sellPrice) * quantity,
      }));

    return NextResponse.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}
