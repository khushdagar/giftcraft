import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getHiddenCategoryIds } from '@/lib/catalog-visibility';

const RecommendationsSchema = z.object({
  budget: z.coerce.number().positive().max(10000000),
  occasion: z.string().max(60).optional(),
  qty: z.coerce.number().positive().int().max(100000).default(1),
});

type TierLite = { tier: number; minQty: number; maxQty: number | null; sellPrice: unknown };

/**
 * Pick the price tier that actually applies to the requested quantity.
 * Falls back to the highest tier whose minQty <= qty, then to tier 1.
 */
function tierForQty(tiers: TierLite[], qty: number): TierLite | null {
  if (tiers.length === 0) return null;
  const sorted = [...tiers].sort((a, b) => a.tier - b.tier);
  const exact = sorted.find(
    (t) => qty >= t.minQty && (t.maxQty == null || qty <= t.maxQty)
  );
  if (exact) return exact;
  // qty above all defined ranges → use the highest tier that starts at/below qty
  const below = [...sorted].reverse().find((t) => t.minQty <= qty);
  return below ?? sorted[0]!;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const validation = RecommendationsSchema.safeParse({
      budget: searchParams.get('budget') ?? 10000,
      occasion: searchParams.get('occasion') ?? undefined,
      qty: searchParams.get('qty') ?? 1,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { budget: totalBudget, qty: quantity, occasion } = validation.data;
    const perUnit = totalBudget / quantity;

    const hiddenCategoryIds = await getHiddenCategoryIds();
    const baseWhere = {
      status: 'active' as const,
      ...(hiddenCategoryIds.length > 0
        ? { categories: { none: { categoryId: { in: hiddenCategoryIds } } } }
        : {}),
    };

    const select = {
      id: true,
      name: true,
      slug: true,
      descriptionShort: true,
      brand: true,
      moq: true,
      priceTiers: {
        select: { tier: true, minQty: true, maxQty: true, sellPrice: true },
        orderBy: { tier: 'asc' as const },
      },
      images: { select: { url: true }, take: 1 },
      occasions: { select: { occasion: { select: { slug: true } } } },
    };

    // Pull products for the chosen occasion. If the occasion has none (or no
    // occasion was given) fall back to the whole active catalogue so the planner
    // is never a dead end.
    let products = occasion
      ? await prisma.product.findMany({
          where: { ...baseWhere, occasions: { some: { occasion: { slug: occasion } } } },
          select,
          take: 200,
        })
      : [];

    let matchedOccasion = products.length > 0;
    if (products.length === 0) {
      products = await prisma.product.findMany({ where: baseWhere, select, take: 200 });
    }

    // Resolve the per-qty price for each product, then split by budget fit.
    const priced = products
      .map((p) => {
        const t = tierForQty(p.priceTiers, quantity);
        if (!t) return null;
        const unit = Number(t.sellPrice);
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.descriptionShort || p.name,
          brand: p.brand ?? null,
          image: p.images[0]?.url ?? null,
          moq: p.moq ?? null,
          unitPrice: unit,
          totalForQty: unit * quantity,
          appliedTier: t.tier,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    // Within budget = unit price fits per-gift budget. Sort premium-first so the
    // buyer sees the most they can afford without going over.
    const withinBudget = priced
      .filter((p) => p.unitPrice <= perUnit)
      .sort((a, b) => b.unitPrice - a.unitPrice);

    // If nothing fits, surface the closest-priced options as "slightly over".
    const overBudget = priced
      .filter((p) => p.unitPrice > perUnit)
      .sort((a, b) => a.unitPrice - b.unitPrice);

    const recommendations = (withinBudget.length > 0 ? withinBudget : overBudget)
      .slice(0, 6)
      .map((p) => ({
        ...p,
        fitsBudget: p.unitPrice <= perUnit,
      }));

    return NextResponse.json({
      success: true,
      data: recommendations,
      meta: {
        perUnitBudget: perUnit,
        matchedOccasion,
        anyWithinBudget: withinBudget.length > 0,
        totalConsidered: priced.length,
      },
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}
