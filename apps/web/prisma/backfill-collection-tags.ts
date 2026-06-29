/**
 * Backfill script — tag-driven Collections.
 *
 * Run this ONCE against an existing database (e.g. the live catalogue imported
 * from the product master) after `prisma db push` adds the new
 * Product.tags / OccasionConfig.tags / OccasionConfig.isCollection columns.
 *
 * It:
 *   1. Upserts the 3 curated collections as OccasionConfig rows (isCollection)
 *      with their match tags.
 *   2. Tags every active product according to simple rules derived from the
 *      product master so each collection auto-populates:
 *        · budget-friendly   → tier-1 sell price < ₹500
 *        · premium-executive → recipient tag VIP/Senior  OR  tier-1 sell ≥ ₹1500
 *        · eco-friendly      → eco-certified  OR  in the "Eco & Sustainable" category
 *
 * Re-running is safe (idempotent): the 3 managed tags are recomputed each run,
 * any other tags on a product are preserved.
 *
 *   npm run db:backfill-tags    (runs `tsx prisma/backfill-collection-tags.ts`)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MANAGED_TAGS = ["budget-friendly", "premium-executive", "eco-friendly", "tech-gifts"];

// Recipient tags (from the product master) that mark a product as "executive".
const PREMIUM_RECIPIENTS = ["VIP Clients", "Senior"];

async function main() {
  console.log("🏷️  Backfilling collection tags…");

  // ── 1. Ensure the 3 collection occasions exist ──────────────
  const collections = [
    ["budget-friendly",   "Budget-Friendly Under ₹500",   "Thoughtful gifts that won't break the bank.",     ["budget-friendly"],   "from-amber-400 to-orange-400"],
    ["premium-executive", "Premium Executive Collection", "Luxury gifts for your most valued relationships.", ["premium-executive"], "from-indigo-400 to-purple-400"],
    ["eco-friendly",      "Eco-Friendly Gifts",           "Sustainable choices for conscious companies.",     ["eco-friendly"],      "from-green-400 to-emerald-400"],
    ["tech-gifts",        "Tech Gifts",                   "Smart gadgets that make work and life easier.",    ["tech-gifts"],        "from-sky-400 to-blue-400"],
  ] as const;

  for (let i = 0; i < collections.length; i++) {
    const [slug, name, description, tags, gradient] = collections[i]!;
    await prisma.occasionConfig.upsert({
      where: { slug },
      create: {
        slug, name, description, gradient,
        icon: "🎁",
        isCollection: true,
        isActive: true,
        sortOrder: i,
        tags: [...tags],
      },
      // Don't clobber a name/description the admin may have customised — only
      // guarantee the collection flag + match tags.
      update: { isCollection: true, tags: [...tags] },
    });
  }
  console.log(`   ✓ ${collections.length} collections ready`);

  // ── 2. Tag products ─────────────────────────────────────────
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      tags: true,
      isEcoCertified: true,
      recipientTags: true,
      priceTiers: { where: { tier: 1 }, select: { sellPrice: true }, take: 1 },
      categories: { select: { category: { select: { name: true } } } },
    },
  });

  let tagged = 0;
  for (const p of products) {
    const tier1 = p.priceTiers[0] ? Number(p.priceTiers[0].sellPrice) : null;
    const inEcoCategory = p.categories.some((c) =>
      (c.category?.name ?? "").toLowerCase().includes("eco")
    );
    const inTechCategory = p.categories.some((c) =>
      (c.category?.name ?? "").toLowerCase().includes("tech")
    );
    const isPremiumRecipient = p.recipientTags.some((t) =>
      PREMIUM_RECIPIENTS.some((r) => t.toLowerCase().includes(r.toLowerCase()))
    );

    const computed: string[] = [];
    if (tier1 !== null && tier1 < 500) computed.push("budget-friendly");
    if (isPremiumRecipient || (tier1 !== null && tier1 >= 1500)) computed.push("premium-executive");
    if (p.isEcoCertified || inEcoCategory) computed.push("eco-friendly");
    if (inTechCategory) computed.push("tech-gifts");

    // Preserve any non-managed tags already on the product.
    const preserved = p.tags.filter((t) => !MANAGED_TAGS.includes(t));
    const next = Array.from(new Set([...preserved, ...computed]));

    // Skip the write when nothing changed.
    const same =
      next.length === p.tags.length && next.every((t) => p.tags.includes(t));
    if (same) continue;

    await prisma.product.update({ where: { id: p.id }, data: { tags: next } });
    tagged++;
  }

  console.log(`   ✓ updated tags on ${tagged}/${products.length} products`);
  console.log("✅ Backfill complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
