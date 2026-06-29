/**
 * Flatten the catalogue to top-level categories only (manager decision: Option A).
 *
 * Safe by construction:
 *   1. For any product linked to a sub-category, ensure it is ALSO linked to the
 *      top-level ancestor (idempotent, skipDuplicates) — so nothing loses its
 *      main category. (Inspection showed 0 products needed this, but we keep the
 *      step so the script is safe to re-run on any data.)
 *   2. Delete every non-top-level category, deepest first. ProductCategory links
 *      to deleted categories cascade away automatically.
 *
 * Top-level categories (parentId = null) are never touched.
 *
 *   npx tsx prisma/flatten-categories.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗂️  Flattening categories to top-level only…');

  const cats = await prisma.category.findMany({
    select: { id: true, name: true, parentId: true },
  });
  const byId = new Map(cats.map((c) => [c.id, c]));
  const children = cats.filter((c) => c.parentId);
  const topLevel = cats.filter((c) => !c.parentId);

  const topAncestor = (id: string): string => {
    let c = byId.get(id);
    while (c && c.parentId && byId.has(c.parentId)) c = byId.get(c.parentId)!;
    return c?.id ?? id;
  };
  const depth = (id: string): number => {
    let d = 0;
    let c = byId.get(id);
    while (c && c.parentId && byId.has(c.parentId)) {
      d++;
      c = byId.get(c.parentId)!;
    }
    return d;
  };

  console.log(`   ${topLevel.length} top-level kept · ${children.length} sub-categories to remove`);

  // ── 1. Defensive remap: product → top-level ancestor ──
  const links = await prisma.productCategory.findMany();
  const existing = new Set(links.map((l) => `${l.productId}|${l.categoryId}`));
  const toCreate: Array<{ productId: string; categoryId: string }> = [];
  for (const l of links) {
    const cat = byId.get(l.categoryId);
    if (!cat || !cat.parentId) continue; // already a top-level link
    const top = topAncestor(l.categoryId);
    const key = `${l.productId}|${top}`;
    if (!existing.has(key)) {
      existing.add(key);
      toCreate.push({ productId: l.productId, categoryId: top });
    }
  }
  if (toCreate.length > 0) {
    await prisma.productCategory.createMany({ data: toCreate, skipDuplicates: true });
  }
  console.log(`   ✓ remapped ${toCreate.length} product link(s) up to their main category`);

  // ── 2. Delete sub-categories, deepest first ──
  const ordered = [...children].sort((a, b) => depth(b.id) - depth(a.id));
  let deleted = 0;
  for (const c of ordered) {
    await prisma.category.delete({ where: { id: c.id } });
    deleted++;
  }
  console.log(`   ✓ removed ${deleted} sub-categories`);

  const remaining = await prisma.category.count();
  console.log(`✅ Done. ${remaining} categories remain (all top-level).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
