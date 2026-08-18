import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { mirrorImageUrls } from '@/lib/import-image-url';

/**
 * POST /api/admin/packs/bulk-upload
 * Bulk-create curated packs from a CSV or Excel file (super_admin only).
 *
 * A pack is a Product with isPack=true whose members live in ProductPackItem.
 * Each row names the pack and lists its member products by SKU (or name) with
 * optional quantities — "DRIN-Insula-4 x2, NOTE-A5-1". Everything the pack form
 * derives automatically is derived here too:
 *   • price      — not stored; computed from members' tiers at render time
 *   • image      — not required; the pack page collages member images
 *   • weight     — Σ (member weight × qty)
 *   • lead time  — max member lead time      • MOQ  — max member MOQ
 *   • box L/W/H  — widest L & W, heights stacked
 *
 * The `collection` column is matched by name and created if it doesn't exist,
 * so new collections of packs can be introduced straight from the sheet.
 * Each row is processed independently. Streams NDJSON progress like the product
 * importer; finishes with { created, failed, errors }.
 */

const VALID_STATUS = ['active', 'draft', 'archived', 'seasonal'];

// Map a human column label (normalised) → canonical field name
const ALIASES: Record<string, string> = {
  'pack name': 'name', name: 'name', pack: 'name',
  collection: 'collection', 'collection name': 'collection', 'pack collection': 'collection',
  'curated collection': 'collection', 'gift collection': 'collection',
  slug: 'slug',
  sku: 'sku', 'pack id': 'sku', 'pack sku': 'sku',
  status: 'status',
  feat: 'isFeatured', featured: 'isFeatured', isfeatured: 'isFeatured',
  sort: 'sortOrder', sortorder: 'sortOrder', 'sort order': 'sortOrder',
  products: 'products', 'product skus': 'products', 'product sku': 'products',
  'items': 'products', 'pack items': 'products', 'member products': 'products',
  'skus': 'products', 'contents': 'products', 'included products': 'products',
  category: 'category', categories: 'category',
  'occasion tags': 'occasions', occasions: 'occasions', occasion: 'occasions',
  tags: 'tags', 'tag': 'tags',
  'recipient tags': 'recipientTags', recipienttags: 'recipientTags', recipient: 'recipientTags',
  'short description': 'descriptionShort', descriptionshort: 'descriptionShort', description: 'descriptionShort',
  'long description': 'descriptionLong', descriptionlong: 'descriptionLong',
  'pack description': 'descriptionLong', 'full description': 'descriptionLong',
  'key features': 'keyFeatures', keyfeatures: 'keyFeatures', features: 'keyFeatures',
  specifications: 'specifications', specification: 'specifications', specs: 'specifications',
  'shipping delivery': 'shippingDelivery', 'shipping and delivery': 'shippingDelivery',
  'shipping & delivery': 'shippingDelivery', shippingdelivery: 'shippingDelivery', shipping: 'shippingDelivery',
  'image urls': 'imageUrls', imageurls: 'imageUrls', images: 'imageUrls', 'image url': 'imageUrls',
  'pack image': 'imageUrls', image: 'imageUrls', photo: 'imageUrls', photos: 'imageUrls',
};

function norm(s: any): string {
  return (s ?? '')
    .toString()
    .toLowerCase()
    .replace(/[×✕]/g, 'x')
    .replace(/[–—]/g, '-')
    .replace(/[₹%?]/g, '')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const toBool = (v?: string) => ['yes', 'true', '1', 'y'].includes((v || '').trim().toLowerCase());
const toNum = (v?: string): number | null => {
  if (v == null) return null;
  const cleaned = String(v).replace(/[₹,%\s]/g, '').trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};
const toList = (v?: string): string[] =>
  (v || '').split(/[\n,;|]/).map((s) => s.trim()).filter(Boolean);
const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

/**
 * Parse one entry of the `products` cell into a SKU/name + quantity.
 * Accepts "SKU x2", "SKU × 2", "SKU*2", "2 x SKU", "SKU:2" and plain "SKU".
 */
function parseMemberEntry(raw: string): { key: string; quantity: number } {
  const s = raw.trim();
  let m = s.match(/^(.*?)\s*[x×*:]\s*(\d+)$/i);
  if (m && m[1] && m[2]) return { key: m[1].trim(), quantity: Math.max(1, Number(m[2])) };
  m = s.match(/^(\d+)\s*[x×*]\s*(.+)$/i);
  if (m && m[1] && m[2]) return { key: m[2].trim(), quantity: Math.max(1, Number(m[1])) };
  return { key: s, quantity: 1 };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // ── Read CSV or Excel into a row matrix ──
  let matrix: string[][];
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    const fileName = (file.name || '').toLowerCase();
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const buf = Buffer.from(await file.arrayBuffer());
      const wb = XLSX.read(buf, { type: 'buffer' });
      const sheetName =
        wb.SheetNames.find((s) => /pack|bundle|collection/i.test(s)) || wb.SheetNames[0];
      const sheet = sheetName ? wb.Sheets[sheetName] : undefined;
      if (!sheet) return NextResponse.json({ error: 'The Excel file has no sheets' }, { status: 400 });
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false, defval: '' });
      matrix = rows.map((r) => (Array.isArray(r) ? r.map((c) => (c == null ? '' : String(c))) : []));
    } else {
      matrix = parseCsv(await file.text());
    }
  } catch (err) {
    console.error('Could not read pack upload:', err);
    return NextResponse.json({ error: 'Could not read uploaded file' }, { status: 400 });
  }

  matrix = matrix.filter((r) => r.some((c) => (c ?? '').trim() !== ''));
  if (matrix.length < 2) {
    return NextResponse.json({ error: 'File must have a header row and at least one pack row' }, { status: 400 });
  }

  // ── Detect the header row (sheets often have title/group rows above it) ──
  const scoreRow = (cells: string[]) =>
    cells.reduce((s, c) => (ALIASES[norm(c)] ? s + 1 : s), 0);
  let headerIdx = 0;
  let best = -1;
  for (let r = 0; r < Math.min(matrix.length, 15); r++) {
    const row = matrix[r];
    if (!row) continue;
    const s = scoreRow(row);
    if (s > best) { best = s; headerIdx = r; }
  }

  const headerRow = matrix[headerIdx] ?? [];
  const dataRows = matrix.slice(headerIdx + 1);

  const fieldCol: Record<string, number> = {};
  headerRow.forEach((h, i) => {
    const field = ALIASES[norm(h)];
    if (field && fieldCol[field] === undefined) fieldCol[field] = i;
  });

  if (fieldCol['name'] === undefined || fieldCol['products'] === undefined) {
    return NextResponse.json(
      {
        error:
          'Could not find the pack columns. Make sure the sheet has a "name" (pack name) column and a "products" column listing the member SKUs.',
      },
      { status: 400 }
    );
  }

  // ── Caches ──
  const collectionCache = new Map<string, string>();
  const categoryCache = new Map<string, string>();
  const occasionCache = new Map<string, string>();
  const memberCache = new Map<string, MemberProduct | null>();

  type MemberProduct = {
    id: string;
    quantityDefault?: number;
    weightG: number | null;
    leadTimeDays: number | null;
    moq: number | null;
    dimensionL: any;
    dimensionW: any;
    dimensionH: any;
  };

  /** Resolve a member by SKU first, then by exact (case-insensitive) name. */
  async function findMember(key: string): Promise<MemberProduct | null> {
    const cacheKey = key.toLowerCase();
    if (memberCache.has(cacheKey)) return memberCache.get(cacheKey)!;
    const select = {
      id: true, weightG: true, leadTimeDays: true, moq: true,
      dimensionL: true, dimensionW: true, dimensionH: true,
    };
    let p: any = await prisma.product.findFirst({
      where: { sku: { equals: key, mode: 'insensitive' }, isPack: false },
      select,
    });
    if (!p) {
      p = await prisma.product.findFirst({
        where: { name: { equals: key, mode: 'insensitive' }, isPack: false },
        select,
      });
    }
    memberCache.set(cacheKey, p);
    return p;
  }

  async function getOrCreateCollection(name: string): Promise<string> {
    const key = name.toLowerCase();
    if (collectionCache.has(key)) return collectionCache.get(key)!;
    let col = await prisma.giftCollection.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (!col) {
      try {
        col = await prisma.giftCollection.create({
          data: { name, slug: slugify(name) || `collection-${Date.now().toString(36)}` },
        });
      } catch {
        col = await prisma.giftCollection.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
      }
    }
    collectionCache.set(key, col!.id);
    return col!.id;
  }
  async function getOrCreateCategory(name: string): Promise<string> {
    const key = name.toLowerCase();
    if (categoryCache.has(key)) return categoryCache.get(key)!;
    let cat = await prisma.category.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
    if (!cat) {
      try {
        cat = await prisma.category.create({
          data: { name, slug: slugify(name) || `cat-${Date.now().toString(36)}` },
        });
      } catch {
        cat = await prisma.category.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
      }
    }
    categoryCache.set(key, cat!.id);
    return cat!.id;
  }
  async function getOrCreateOccasion(name: string): Promise<string> {
    const key = name.toLowerCase();
    if (occasionCache.has(key)) return occasionCache.get(key)!;
    let occ = await prisma.occasionConfig.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
    if (!occ) {
      try {
        occ = await prisma.occasionConfig.create({
          data: { name, slug: slugify(name) || `occ-${Date.now().toString(36)}` },
        });
      } catch {
        occ = await prisma.occasionConfig.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
      }
    }
    occasionCache.set(key, occ!.id);
    return occ!.id;
  }

  const errors: { row: number; pack: string; message: string }[] = [];
  // Image links that could not be fetched. Non-fatal — the row still imports
  // (a pack with no image of its own collages its members' images).
  const warnings: { row: number; pack: string; message: string }[] = [];
  let created = 0;
  let imagesUploaded = 0;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: any) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      send({ type: 'start', total: dataRows.length });
      await runImport(send);
      send({ type: 'done', success: true, created, failed: errors.length, total: dataRows.length, errors, warnings, images: imagesUploaded });
      controller.close();
    },
  });

  async function runImport(send: (obj: any) => void) {
    for (let r = 0; r < dataRows.length; r++) {
      const cells = dataRows[r] ?? [];
      const cell = (i?: number) => (i !== undefined && i < cells.length ? (cells[i] ?? '').trim() : '');
      const get = (field: string) => cell(fieldCol[field]);
      const rowNum = headerIdx + 2 + r;
      const name = get('name');

      try {
        if (!name) {
          errors.push({ row: rowNum, pack: '', message: 'Missing pack name' });
          continue;
        }

        // ── Members ──────────────────────────────────────────────────────────
        const entries = toList(get('products')).map(parseMemberEntry);
        if (entries.length === 0) {
          errors.push({ row: rowNum, pack: name, message: 'No member products listed' });
          continue;
        }
        const items: { productId: string; quantity: number }[] = [];
        const missing: string[] = [];
        const seen = new Set<string>();
        const resolved: { m: MemberProduct; quantity: number }[] = [];
        for (const e of entries) {
          const m = await findMember(e.key);
          if (!m) { missing.push(e.key); continue; }
          if (seen.has(m.id)) continue; // DB unique [packId, productId]
          seen.add(m.id);
          items.push({ productId: m.id, quantity: e.quantity });
          resolved.push({ m, quantity: e.quantity });
        }
        // A pack missing a member would price and collage wrongly, so fail the
        // whole row rather than silently creating an incomplete pack.
        if (missing.length) {
          errors.push({
            row: rowNum,
            pack: name,
            message: `Product not found: ${missing.join(', ')}`,
          });
          continue;
        }

        // ── Identity ─────────────────────────────────────────────────────────
        const baseSlug = slugify(get('slug') || name) || `pack-${Date.now().toString(36)}-${r}`;
        let slug = baseSlug;
        if (await prisma.product.findFirst({ where: { slug }, select: { id: true } })) {
          slug = `${baseSlug}-${Date.now().toString(36)}`;
        }
        // Mirrors the pack form: SKU is required on Product but meaningless for a
        // bundle, so it's generated from the name unless the sheet supplies one.
        const sku = (get('sku') || `PACK-${baseSlug}`).toUpperCase();
        if (await prisma.product.findUnique({ where: { sku }, select: { id: true } })) {
          errors.push({ row: rowNum, pack: name, message: `Pack SKU ${sku} already exists — skipped` });
          continue;
        }

        // ── Derived physical attributes (same rules as the pack form) ────────
        const num = (v: any) => {
          const n = v == null ? 0 : Number(v);
          return Number.isFinite(n) ? n : 0;
        };
        const weightG = resolved.reduce((s, it) => s + num(it.m.weightG) * it.quantity, 0);
        const leadTimeDays = resolved.reduce((m, it) => Math.max(m, num(it.m.leadTimeDays)), 0);
        const moq = resolved.reduce((m, it) => Math.max(m, num(it.m.moq)), 0);
        const dimensionL = resolved.reduce((m, it) => Math.max(m, num(it.m.dimensionL)), 0);
        const dimensionW = resolved.reduce((m, it) => Math.max(m, num(it.m.dimensionW)), 0);
        const dimensionH = resolved.reduce((s, it) => s + num(it.m.dimensionH) * it.quantity, 0);

        const statusRaw = get('status').toLowerCase();
        const status = VALID_STATUS.includes(statusRaw) ? statusRaw : 'active';

        const collectionName = get('collection');
        const collectionId = collectionName ? await getOrCreateCollection(collectionName) : null;

        const tags = toList(get('tags'));
        const recipientTags = toList(get('recipientTags'));
        // Drive share links and any other public image URL are downloaded and
        // re-hosted on our CDN — same pipeline as a manual upload.
        const rawImageUrls = toList(get('imageUrls'));
        // Report at image granularity — a row-only bar looks frozen while a
        // folder's worth of photos downloads.
        const imageProgress = (done: number, total: number) =>
          send({
            type: 'progress',
            current: r,
            total: dataRows.length,
            created,
            failed: errors.length,
            images: imagesUploaded + done,
            imgDone: done,
            imgTotal: total,
            note:
              total === 0
                ? `Reading image links for ${name}…`
                : `${name}: image ${Math.min(done + 1, total)} of ${total}…`,
          });
        if (rawImageUrls.length) imageProgress(0, 0);
        const { urls: imageUrls, warnings: imageWarnings } = await mirrorImageUrls(
          rawImageUrls,
          'packs',
          imageProgress,
        );
        imagesUploaded += imageUrls.length;
        for (const message of imageWarnings) warnings.push({ row: rowNum, pack: name, message });

        const pack = await prisma.product.create({
          data: {
            name,
            slug,
            sku,
            isPack: true,
            packCollectionId: collectionId,
            descriptionShort: get('descriptionShort') || null,
            descriptionLong: get('descriptionLong') || null,
            keyFeatures: get('keyFeatures') || null,
            specifications: get('specifications') || null,
            shippingDelivery: get('shippingDelivery') || null,
            status: status as any,
            isFeatured: toBool(get('isFeatured')),
            ...(toNum(get('sortOrder')) != null && { sortOrder: toNum(get('sortOrder'))! }),
            // Derived from members — a pack carries no prices or HSN of its own.
            weightG: weightG || null,
            ...(leadTimeDays > 0 && { leadTimeDays }),
            ...(moq > 0 && { moq }),
            dimensionL: dimensionL || null,
            dimensionW: dimensionW || null,
            dimensionH: dimensionH || null,
            ...(tags.length && { tags }),
            ...(recipientTags.length && { recipientTags }),
            packItems: {
              createMany: {
                data: items.map((it, i) => ({
                  productId: it.productId,
                  quantity: it.quantity,
                  sortOrder: i,
                })),
              },
            },
            // Optional — when absent the pack page collages its members' images.
            ...(imageUrls.length && {
              images: { createMany: { data: imageUrls.map((url, i) => ({ url, isPrimary: i === 0 })) } },
            }),
          },
        });

        for (const catName of toList(get('category'))) {
          const catId = await getOrCreateCategory(catName);
          await prisma.productCategory.create({ data: { productId: pack.id, categoryId: catId } }).catch(() => {});
        }
        for (const occName of toList(get('occasions'))) {
          const occId = await getOrCreateOccasion(occName);
          await prisma.productOccasion.create({ data: { productId: pack.id, occasionId: occId } }).catch(() => {});
        }

        created++;
      } catch (err: any) {
        errors.push({
          row: rowNum,
          pack: name,
          message: err?.code === 'P2002' ? 'Duplicate value (SKU/slug already exists)' : (err?.message || 'Failed to create'),
        });
      } finally {
        send({ type: 'progress', current: r + 1, total: dataRows.length, created, failed: errors.length, images: imagesUploaded });
      }
    }
  }

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}

// ── CSV parsing (RFC-4180-ish: quotes, embedded commas & newlines) ──
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\r') {
      // ignore
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}
