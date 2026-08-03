/**
 * One-off repair for slugs written by the old admin forms.
 *
 * Those forms turned spaces into hyphens BEFORE stripping punctuation, so a
 * name like "Tech & Gadgets" was saved as "tech--gadgets" — a double hyphen in
 * the public URL. `slugify` now collapses in a single pass, but rows created
 * before the fix still carry the bad handle.
 *
 * This normalises the EXISTING SLUG rather than regenerating it from the name:
 * a slug an admin deliberately customised ("corporate-gifting-india" on a
 * category called "Corporate Gifts") keeps its wording and only loses the
 * malformed punctuation. Regenerating from the name would silently discard
 * that work — and break the URL a second time.
 *
 * Idempotent: a run over already-clean data changes nothing.
 *
 *   npm run db:fix-slugs -- --dry     # report only
 *   npm run db:fix-slugs              # apply
 */
import { PrismaClient } from '@prisma/client';
import { slugify } from '../lib/slug';

const prisma = new PrismaClient();
const DRY = process.argv.includes('--dry');

type Row = { id: string; name: string; slug: string };

/** Every model whose slug is part of a public URL. */
const MODELS = [
  { label: 'Category', delegate: prisma.category },
  { label: 'OccasionConfig', delegate: prisma.occasionConfig },
  { label: 'GiftCollection', delegate: prisma.giftCollection },
  { label: 'GiftPack', delegate: prisma.giftPack },
] as const;

async function fixModel(label: string, delegate: any) {
  const rows: Row[] = await delegate.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { slug: 'asc' },
  });

  // Slugs already in use, so a repair can never collide with a sibling.
  const taken = new Set(rows.map((r) => r.slug));
  let fixed = 0;

  for (const row of rows) {
    const clean = slugify(row.slug) || slugify(row.name);
    if (!clean || clean === row.slug) continue;

    // Another row already owns the cleaned handle (e.g. "tech--gadgets" and
    // "tech-gadgets" both exist). Suffix rather than fail the whole run.
    let candidate = clean;
    for (let n = 2; taken.has(candidate); n++) candidate = `${clean}-${n}`;

    console.log(`  ${label}: "${row.slug}" → "${candidate}"  (${row.name})`);
    if (!DRY) {
      await delegate.update({ where: { id: row.id }, data: { slug: candidate } });
    }
    taken.delete(row.slug);
    taken.add(candidate);
    fixed++;
  }

  console.log(`${label}: ${fixed} of ${rows.length} slug(s) ${DRY ? 'would be ' : ''}repaired`);
  return fixed;
}

async function main() {
  console.log(DRY ? 'DRY RUN — nothing will be written\n' : 'Repairing slugs\n');
  let total = 0;
  for (const { label, delegate } of MODELS) {
    total += await fixModel(label, delegate);
  }
  console.log(`\nDone. ${total} slug(s) ${DRY ? 'would change' : 'changed'}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
