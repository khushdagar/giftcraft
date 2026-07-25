/**
 * One-off backfill: re-compress images already sitting in Digital Ocean Spaces.
 *
 * For every raster image in the bucket that is NOT already a processed WebP, this
 * runs the same server pipeline (lib/image-processing.ts) and writes a WebP
 * primary + responsive variants next to the original. It NEVER deletes originals
 * and, by default, NEVER touches the database — it emits a manifest mapping each
 * old URL to its new WebP URL so you can rewire references deliberately.
 *
 * Usage (from apps/web):
 *   npx tsx scripts/backfill-images.ts --dry-run            # report only, no writes
 *   npx tsx scripts/backfill-images.ts                      # actually upload WebP + variants
 *   npx tsx scripts/backfill-images.ts --prefix=products/   # limit to one folder
 *   npx tsx scripts/backfill-images.ts --limit=50           # cap objects processed
 *
 * DO NOT run this without first taking a bucket snapshot / confirming credentials.
 * It is intentionally left with --dry-run available and is not wired into CI.
 */

import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { processImage, sniffImageFormat } from '../lib/image-processing';

interface Args {
  dryRun: boolean;
  prefix: string | undefined;
  limit: number;
}

function parseArgs(argv: string[]): Args {
  const get = (name: string) => argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
  return {
    dryRun: argv.includes('--dry-run'),
    prefix: get('prefix'),
    limit: get('limit') ? parseInt(get('limit')!, 10) : Infinity,
  };
}

const RASTER_EXT = /\.(jpe?g|png|webp|avif|heic|heif)$/i;

function buildClient() {
  const region = process.env.DO_SPACES_REGION || 'sfo3';
  const accessKeyId = process.env.DO_SPACES_KEY;
  const secretAccessKey = process.env.DO_SPACES_SECRET;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('DO_SPACES_KEY / DO_SPACES_SECRET must be set to run the backfill.');
  }
  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    endpoint: `https://${region}.digitaloceanspaces.com`,
    forcePathStyle: false,
  });
  const bucket = process.env.DO_SPACES_BUCKET || 'giftcraft-dev';
  const cdn =
    process.env.DO_SPACES_CDN_ENDPOINT ||
    `https://${bucket}.${region}.cdn.digitaloceanspaces.com`;
  return { client, bucket, cdn, region };
}

async function streamToBuffer(body: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Buffer>) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { client, bucket, cdn } = buildClient();

  console.log(`\n=== Image backfill ${args.dryRun ? '(DRY RUN — no writes)' : '(LIVE)'} ===`);
  console.log(`Bucket: ${bucket}  Prefix: ${args.prefix ?? '(all)'}  Limit: ${args.limit}\n`);

  const manifest: { from: string; to: string; variants: string[]; savedPct: number }[] = [];
  let scanned = 0;
  let processed = 0;
  let skipped = 0;
  let failed = 0;
  let ContinuationToken: string | undefined;

  outer: do {
    const list = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: args.prefix, ContinuationToken }),
    );
    ContinuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;

    for (const obj of list.Contents ?? []) {
      if (processed + skipped >= args.limit) break outer;
      const key = obj.Key;
      if (!key || !RASTER_EXT.test(key)) continue;
      scanned++;

      // Already a variant we generated? Skip (…-320w.webp / …-640w.webp / …).
      if (/-\d+w\.webp$/i.test(key)) {
        skipped++;
        continue;
      }

      try {
        const got = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        const original = await streamToBuffer(got.Body);

        if (!sniffImageFormat(original)) {
          skipped++;
          continue;
        }

        // Heuristic: logos/brand-assets tend to be graphics/text.
        const hasText = /(^|\/)(logos|brand|brand-assets)\//i.test(key);
        const result = await processImage(original, { hasText });

        const dot = key.lastIndexOf('.');
        const base = dot > 0 ? key.slice(0, dot) : key;
        const primaryKey = `${base}.webp`;
        const savedPct = Math.round((1 - result.primary.length / original.length) * 100);

        const variantKeys: string[] = [];
        if (!args.dryRun) {
          await client.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: primaryKey,
              Body: result.primary,
              ContentType: result.contentType,
              ACL: 'public-read',
              CacheControl: 'public, max-age=31536000, immutable',
            }),
          );
          for (const v of result.variants) {
            const vKey = `${base}${v.suffix}.webp`;
            await client.send(
              new PutObjectCommand({
                Bucket: bucket,
                Key: vKey,
                Body: v.buffer,
                ContentType: result.contentType,
                ACL: 'public-read',
                CacheControl: 'public, max-age=31536000, immutable',
              }),
            );
            variantKeys.push(vKey);
          }
        } else {
          for (const v of result.variants) variantKeys.push(`${base}${v.suffix}.webp`);
        }

        manifest.push({
          from: `${cdn}/${key}`,
          to: `${cdn}/${primaryKey}`,
          variants: variantKeys.map((k) => `${cdn}/${k}`),
          savedPct,
        });
        processed++;
        console.log(`${args.dryRun ? 'would process' : 'processed'}: ${key} → ${primaryKey}  (-${savedPct}%, +${variantKeys.length} variants)`);
      } catch (err) {
        failed++;
        console.error(`FAILED: ${key} — ${err instanceof Error ? err.message : err}`);
      }
    }
  } while (ContinuationToken);

  console.log(`\n=== Done ===`);
  console.log(`scanned=${scanned} processed=${processed} skipped=${skipped} failed=${failed}`);
  console.log(
    `\nManifest (old URL → new WebP URL). Use this to update DB references ` +
      `(ProductImage.url, BrandAsset.fileUrl, etc.) as a SEPARATE, reviewed step:\n`,
  );
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
