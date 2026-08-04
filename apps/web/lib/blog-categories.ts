/**
 * Blog categories are not a list someone curates — they exist only because a
 * post uses one. Typing a name in the post editor creates it; removing the last
 * post that used it takes it away again. Server-only (imports Prisma).
 */
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/blog';
import { isHiddenCategory } from '@/lib/catalog-visibility';

/** Match a typed category name by slug, creating it if it is new. */
export async function resolveCategoryId(name: string | null | undefined): Promise<string | null> {
  const clean = (name ?? '').trim();
  if (!clean) return null;

  const slug = slugify(clean);
  if (!slug) return null;

  const existing = await prisma.blogCategory.findUnique({ where: { slug } });
  if (existing) return existing.id;

  const created = await prisma.blogCategory.create({ data: { name: clean, slug } });
  return created.id;
}

/** Drop categories no post points at, so no dead filter ever shows up. */
export async function pruneEmptyCategories(): Promise<void> {
  await prisma.blogCategory.deleteMany({ where: { posts: { none: {} } } });
}

/**
 * The options in the post editor's Category dropdown: every product category
 * the catalogue uses, so the blog and the shop speak the same language, plus
 * any blog-only category a post already holds. Packaging and Add-on are
 * builder plumbing, not subjects to write about, so they're left out.
 */
export async function blogCategoryOptions(): Promise<string[]> {
  const [productCategories, blogCategories] = await Promise.all([
    prisma.category.findMany({ select: { name: true, slug: true }, orderBy: { name: 'asc' } }),
    prisma.blogCategory.findMany({ where: { posts: { some: {} } }, select: { name: true } }),
  ]);

  const names = new Set<string>();
  for (const c of productCategories) {
    if (!isHiddenCategory(c)) names.add(c.name);
  }
  for (const c of blogCategories) names.add(c.name);

  return Array.from(names).sort((a, b) => a.localeCompare(b));
}
