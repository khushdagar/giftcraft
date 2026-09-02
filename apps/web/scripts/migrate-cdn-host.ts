/**
 * One-off migration: rewrite stored asset URLs from the legacy Spaces hostnames
 * (giftcraft-dev.<region>[.cdn].digitaloceanspaces.com) to the branded CDN
 * alias https://cdn.givoo.in.
 *
 * PREREQUISITE — do this in the DigitalOcean panel FIRST:
 *   Spaces → giftcraft-dev → Settings → CDN → Edit → add custom subdomain
 *   "cdn.givoo.in" (givoo.in is already on DO DNS, so DO creates the record
 *   and the Let's Encrypt cert automatically). Then set
 *   DO_SPACES_CDN_ENDPOINT="https://cdn.givoo.in" in App Platform env vars
 *   and locally, so NEW uploads use the branded host too.
 *
 * The script refuses to write anything until a sample of real asset URLs from
 * the database verifiably resolves on the new host (preflight HEAD checks).
 *
 * It sweeps EVERY text / varchar / text[] / json / jsonb column in the public
 * schema, so blog rich-text content, QC photo arrays, quote payload snapshots
 * etc. are all covered without hand-listing models. Old-host URLs keep working
 * afterwards (the alias serves the same bucket), so this is zero-downtime and
 * reversible.
 *
 * Usage (from apps/web):
 *   npx tsx scripts/migrate-cdn-host.ts            # dry run: preflight + per-column counts
 *   npx tsx scripts/migrate-cdn-host.ts --apply    # actually rewrite
 *   npx tsx scripts/migrate-cdn-host.ts --verify   # post-migration: HEAD-check sampled new-host URLs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const VERIFY_ONLY = process.argv.includes('--verify');

const NEW_HOST = 'cdn.givoo.in';
// cdn variants listed before their origin counterparts on purpose.
const OLD_HOSTS = [
  'giftcraft-dev.sfo3.cdn.digitaloceanspaces.com',
  'giftcraft-dev.sfo3.digitaloceanspaces.com',
  'giftcraft-dev.blr1.cdn.digitaloceanspaces.com',
  'giftcraft-dev.blr1.digitaloceanspaces.com',
];

interface Col {
  table_name: string;
  column_name: string;
  udt_name: string; // text | varchar | _text | _varchar | json | jsonb
}

const q = (ident: string) => `"${ident.replace(/"/g, '""')}"`;

/** SQL expression that views the column as plain text for LIKE matching. */
function asText(col: Col): string {
  const c = q(col.column_name);
  if (col.udt_name.startsWith('_')) return `array_to_string(${c}, ' ')`;
  if (col.udt_name === 'json' || col.udt_name === 'jsonb') return `${c}::text`;
  return c;
}

function likeAnyOldHost(col: Col): string {
  return OLD_HOSTS.map((h) => `${asText(col)} LIKE '%${h}%'`).join(' OR ');
}

/** SQL expression producing the rewritten column value. */
function replacedValue(col: Col): string {
  const c = q(col.column_name);
  if (col.udt_name.startsWith('_')) {
    let inner = 'x';
    for (const h of OLD_HOSTS) inner = `replace(${inner}, '${h}', '${NEW_HOST}')`;
    return `(SELECT coalesce(array_agg(${inner}), '{}') FROM unnest(${c}) AS x)`;
  }
  let expr = col.udt_name === 'json' || col.udt_name === 'jsonb' ? `${c}::text` : c;
  for (const h of OLD_HOSTS) expr = `replace(${expr}, '${h}', '${NEW_HOST}')`;
  if (col.udt_name === 'json') return `${expr}::json`;
  if (col.udt_name === 'jsonb') return `${expr}::jsonb`;
  return expr;
}

async function textColumns(): Promise<Col[]> {
  return prisma.$queryRawUnsafe<Col[]>(`
    SELECT table_name, column_name, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name NOT LIKE '\\_prisma%'
      AND udt_name IN ('text', 'varchar', '_text', '_varchar', 'json', 'jsonb')
    ORDER BY table_name, column_name
  `);
}

/** Pull a handful of real old-host URLs out of the data for preflight checks. */
async function sampleOldUrls(cols: Col[], max = 12): Promise<string[]> {
  const urls = new Set<string>();
  const urlRe = new RegExp(`https://(?:${OLD_HOSTS.map((h) => h.replace(/\./g, '\\.')).join('|')})[^\\s"'<>)\\\\]+`, 'g');
  for (const col of cols) {
    if (urls.size >= max) break;
    const rows = await prisma.$queryRawUnsafe<{ v: string }[]>(
      `SELECT ${asText(col)} AS v FROM ${q(col.table_name)} WHERE ${likeAnyOldHost(col)} LIMIT 2`,
    );
    for (const r of rows) for (const m of r.v.match(urlRe) ?? []) urls.add(m);
  }
  return [...urls].slice(0, max);
}

async function headOk(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return res.ok;
  } catch {
    return false;
  }
}

async function preflight(cols: Col[]): Promise<string[]> {
  const oldUrls = await sampleOldUrls(cols);
  if (oldUrls.length === 0) {
    console.log('Preflight: no old-host URLs found in the database — nothing to migrate.');
    return [];
  }
  console.log(`Preflight: checking ${oldUrls.length} sampled assets on https://${NEW_HOST} ...`);
  let failures = 0;
  for (const oldUrl of oldUrls) {
    const newUrl = OLD_HOSTS.reduce((u, h) => u.replace(h, NEW_HOST), oldUrl);
    const ok = await headOk(newUrl);
    console.log(`  ${ok ? 'OK ' : 'FAIL'} ${newUrl}`);
    if (!ok) failures++;
  }
  if (failures > 0) {
    console.error(
      `\nPreflight FAILED: ${failures}/${oldUrls.length} assets do not resolve on ${NEW_HOST}.\n` +
        'Configure the CDN custom subdomain in the DigitalOcean panel first (see header comment). No data was changed.',
    );
    process.exit(1);
  }
  console.log('Preflight passed — new host serves the same assets.\n');
  return oldUrls;
}

async function main() {
  const cols = await textColumns();

  if (VERIFY_ONLY) {
    // Post-migration: nothing should still reference the old hosts, and
    // new-host URLs sampled from the data must resolve.
    let stale = 0;
    for (const col of cols) {
      const [{ n }] = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
        `SELECT count(*) AS n FROM ${q(col.table_name)} WHERE ${likeAnyOldHost(col)}`,
      );
      if (Number(n) > 0) {
        console.log(`STALE ${col.table_name}.${col.column_name}: ${n} row(s) still reference an old host`);
        stale++;
      }
    }
    if (stale === 0) console.log('No old-host references remain.');

    const urlRe = new RegExp(`https://${NEW_HOST.replace(/\./g, '\\.')}[^\\s"'<>)\\\\]+`, 'g');
    const urls = new Set<string>();
    for (const col of cols) {
      if (urls.size >= 12) break;
      const rows = await prisma.$queryRawUnsafe<{ v: string }[]>(
        `SELECT ${asText(col)} AS v FROM ${q(col.table_name)} WHERE ${asText(col)} LIKE '%${NEW_HOST}%' LIMIT 2`,
      );
      for (const r of rows) for (const m of r.v.match(urlRe) ?? []) urls.add(m);
    }
    let bad = 0;
    for (const u of [...urls].slice(0, 12)) {
      const ok = await headOk(u);
      console.log(`  ${ok ? 'OK ' : 'FAIL'} ${u}`);
      if (!ok) bad++;
    }
    process.exit(stale > 0 || bad > 0 ? 1 : 0);
  }

  await preflight(cols);

  let total = 0;
  for (const col of cols) {
    const [{ n }] = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT count(*) AS n FROM ${q(col.table_name)} WHERE ${likeAnyOldHost(col)}`,
    );
    const count = Number(n);
    if (count === 0) continue;
    total += count;
    console.log(`${col.table_name}.${col.column_name}: ${count} row(s)`);
    if (APPLY) {
      await prisma.$executeRawUnsafe(
        `UPDATE ${q(col.table_name)} SET ${q(col.column_name)} = ${replacedValue(col)} WHERE ${likeAnyOldHost(col)}`,
      );
    }
  }

  console.log(
    APPLY
      ? `\nRewrote ${total} row(s). Run with --verify to confirm, and update DO_SPACES_CDN_ENDPOINT so new uploads use ${NEW_HOST}.`
      : `\nDry run: ${total} row(s) would be rewritten. Rerun with --apply to write.`,
  );
}

main().finally(() => prisma.$disconnect());
