import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { uploadToDigitalOcean } from '@/lib/upload-to-digital-ocean';
import { readZip } from '@/lib/read-zip';

/**
 * POST /api/admin/products/bulk-images
 * Attach images to many products at once by matching filenames to SKUs
 * (super_admin only).
 *
 * Accepts a ZIP, or loose image files, in either layout:
 *
 *   ASG-DRK-ISB-01/front.jpg     folder named by SKU  (order: filename asc)
 *   ASG-DRK-ISB-01.jpg           file named by SKU
 *   ASG-DRK-ISB-01-2.jpg         "-2", "-3" … order the extras
 *
 * The folder form is the one to use for downloaded Drive folders — only the
 * folder needs renaming, not every file inside it.
 *
 * Each image goes through the same uploadToDigitalOcean() pipeline as a manual
 * upload, so Spaces gets the AVIF/WebP variants too. Progress streams as NDJSON.
 */

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif)$/i;
const MAX_BYTES = 10 * 1024 * 1024;

/** Strip the archive path and extension down to the SKU it refers to. */
function skuFromPath(path: string): { sku: string; sortKey: string } | null {
  const parts = path.split('/').filter((s) => s && s !== '.');
  const file = parts[parts.length - 1] ?? '';
  if (!IMAGE_EXT.test(file)) return null;
  // macOS archives carry these; they are not product images.
  if (parts.some((s) => s === '__MACOSX') || file.startsWith('._')) return null;

  // Prefer the containing folder when there is one — that is the SKU-named
  // layout, and the filenames inside it are arbitrary.
  const folder = parts.length > 1 ? parts[parts.length - 2]! : '';
  if (folder && !IMAGE_EXT.test(folder)) {
    return { sku: folder.trim(), sortKey: file.toLowerCase() };
  }

  // Otherwise the filename itself is the SKU, with an optional "-2" suffix.
  const base = file.replace(IMAGE_EXT, '');
  const m = base.match(/^(.*?)[-_](\d{1,3})$/);
  if (m?.[1] && m[2]) return { sku: m[1].trim(), sortKey: m[2].padStart(4, '0') };
  return { sku: base.trim(), sortKey: '0000' };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // ── Collect every candidate image out of the upload ──
  let items: { path: string; data: Buffer; type: string }[] = [];
  const skipped: { name: string; reason: string }[] = [];

  try {
    const formData = await request.formData();
    const files = formData.getAll('files').filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    for (const f of files) {
      const isZip = /\.zip$/i.test(f.name) || f.type === 'application/zip';
      if (isZip) {
        const { entries, skipped: zipSkipped } = readZip(Buffer.from(await f.arrayBuffer()));
        for (const s of zipSkipped) skipped.push({ name: s.path, reason: s.reason });
        for (const e of entries) {
          if (!IMAGE_EXT.test(e.path)) continue;
          items.push({ path: e.path, data: e.data, type: 'image/' + (e.path.split('.').pop() || 'jpeg') });
        }
      } else if (IMAGE_EXT.test(f.name)) {
        // webkitdirectory sends the relative path here; plain pickers send the name.
        const path = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
        items.push({ path, data: Buffer.from(await f.arrayBuffer()), type: f.type || 'image/jpeg' });
      } else {
        skipped.push({ name: f.name, reason: 'not an image or .zip' });
      }
    }
  } catch (err) {
    console.error('Could not read bulk image upload:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not read the uploaded file' },
      { status: 400 }
    );
  }

  if (items.length === 0) {
    return NextResponse.json({ error: 'No images found in the upload' }, { status: 400 });
  }

  // ── Group by SKU, ordered so the intended cover lands first ──
  const bySku = new Map<string, { path: string; data: Buffer; type: string; sortKey: string }[]>();
  for (const it of items) {
    const parsed = skuFromPath(it.path);
    if (!parsed) { skipped.push({ name: it.path, reason: 'could not read a SKU from the name' }); continue; }
    const list = bySku.get(parsed.sku) ?? [];
    list.push({ ...it, sortKey: parsed.sortKey });
    bySku.set(parsed.sku, list);
  }
  for (const list of bySku.values()) list.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  // Resolve SKUs up front so unmatched folders are reported before any upload.
  const products = await prisma.product.findMany({
    where: { sku: { in: [...bySku.keys()] } },
    select: { id: true, sku: true, _count: { select: { images: true } } },
  });
  const productBySku = new Map(products.map((p) => [p.sku, p]));

  const unmatched: string[] = [];
  for (const sku of bySku.keys()) if (!productBySku.has(sku)) unmatched.push(sku);

  const errors: { sku: string; file: string; message: string }[] = [];
  let uploaded = 0;
  let productsTouched = 0;

  const totalImages = [...bySku.entries()]
    .filter(([sku]) => productBySku.has(sku))
    .reduce((n, [, list]) => n + list.length, 0);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(encoder.encode(JSON.stringify(o) + '\n'));
      send({ type: 'start', total: totalImages, products: productBySku.size, unmatched });

      let done = 0;
      for (const [sku, list] of bySku) {
        const product = productBySku.get(sku);
        if (!product) continue;

        // Only claim cover when the product has none — never demote an image
        // the user has already chosen as the cover.
        let existing = product._count.images;
        let addedForProduct = 0;

        for (const img of list) {
          try {
            if (img.data.length > MAX_BYTES) {
              throw new Error(`exceeds ${MAX_BYTES / 1024 / 1024}MB`);
            }
            const file = new File([new Uint8Array(img.data)], img.path.split('/').pop() || 'image.jpg', {
              type: img.type,
            });
            const url = await uploadToDigitalOcean(file, 'products');
            await prisma.productImage.create({
              data: {
                productId: product.id,
                url,
                isPrimary: existing === 0 && addedForProduct === 0,
                sortOrder: existing + addedForProduct,
                altText: null,
              },
            });
            addedForProduct++;
            uploaded++;
          } catch (err) {
            errors.push({
              sku,
              file: img.path,
              message: err instanceof Error ? err.message : 'upload failed',
            });
          } finally {
            done++;
            send({ type: 'progress', current: done, total: totalImages, uploaded, failed: errors.length });
          }
        }
        if (addedForProduct > 0) productsTouched++;
      }

      send({
        type: 'done',
        uploaded,
        productsTouched,
        total: totalImages,
        unmatched,
        skipped,
        errors,
      });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
