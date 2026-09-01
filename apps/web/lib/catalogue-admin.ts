import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slug';
import type { CatalogueInput } from '@/lib/catalogue';

/** Server-side helpers shared by the admin catalogue routes. */

/** Unique slug from the title (or an explicit slug), suffixing -2, -3… */
export async function uniqueCatalogueSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || 'catalogue';
  let candidate = root;
  for (let n = 2; n < 100; n++) {
    const clash = await prisma.catalogue.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!clash || clash.id === excludeId) return candidate;
    candidate = `${root}-${n}`;
  }
  return `${root}-${Date.now()}`;
}

function dedupe<T extends { productId: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((it) => {
    if (seen.has(it.productId)) return false;
    seen.add(it.productId);
    return true;
  });
}

/** Nested create input for a catalogue's sections + items, in order. */
export function sectionsCreateInput(sections: CatalogueInput['sections']) {
  return sections.map((s, i) => ({
    title: s.title,
    mode: s.mode,
    categoryId: s.mode === 'category' ? s.categoryId || null : null,
    includeChildren: s.includeChildren,
    maxProducts: s.mode === 'category' ? s.maxProducts || null : null,
    sortOrder: i,
    items:
      s.mode === 'manual'
        ? {
            create: dedupe(s.items).map((it, j) => ({
              productId: it.productId,
              badge: it.badge?.trim() || null,
              sortOrder: j,
            })),
          }
        : undefined,
  }));
}

/** Plain field map for create/update, from validated input. */
export function catalogueScalarData(input: CatalogueInput) {
  return {
    title: input.title,
    closingNote: input.closingNote || null,
    coverImageUrl: input.coverImageUrl || null,
    closingImageUrl: input.closingImageUrl || null,
    theme: input.theme,
    priceMode: input.priceMode,
    showSku: input.showSku,
    showMoq: input.showMoq,
  };
}
