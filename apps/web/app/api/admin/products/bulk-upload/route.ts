import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';

/**
 * POST /api/admin/products/bulk-upload
 * Bulk-create products from a CSV or Excel file (super_admin only).
 *
 * Understands BOTH the machine-named template AND the human "product master"
 * sheet directly: it auto-detects the header row (sheets often have a title +
 * group row above the real headers) and maps column labels via aliases
 * ("Product ID"→sku, "Colour Variants"→colors, "1–24 Sell ₹"→tier 1, etc.).
 * Dimensions like "7×7×26 cm" are split into L/W/H, tier ranges are derived,
 * and HSN codes are auto-created from the sheet's HSN + GST% if missing.
 *
 * Each row is processed independently. Returns { created, failed, errors }.
 */

const VALID_STATUS = ['active', 'draft', 'archived', 'seasonal'];

// Map a human column label (normalised) → canonical field name
const ALIASES: Record<string, string> = {
  'product id': 'sku', sku: 'sku',
  'product name': 'name', name: 'name', 'item name': 'name',
  status: 'status',
  'feat': 'isFeatured', featured: 'isFeatured', isfeatured: 'isFeatured',
  sort: 'sortOrder', sortorder: 'sortOrder',
  brand: 'brand',
  category: 'category',
  'sub-category': 'subcategory', subcategory: 'subcategory', 'sub category': 'subcategory',
  material: 'material',
  'dimensions lxwxh': 'dimensions', dimensions: 'dimensions', 'dimension': 'dimensions',
  // The generated template emits these three explicitly; without aliases the
  // importer silently dropped every dimension it was handed.
  lengthcm: 'lengthCm', 'length cm': 'lengthCm', length: 'lengthCm',
  widthcm: 'widthCm', 'width cm': 'widthCm', width: 'widthCm',
  heightcm: 'heightCm', 'height cm': 'heightCm', height: 'heightCm',
  'wt g': 'weightG', 'weight g': 'weightG', weight: 'weightG', wt: 'weightG', weightg: 'weightG',
  'colour variants': 'colors', 'color variants': 'colors', colors: 'colors', colours: 'colors', colour: 'colors', color: 'colors',
  'size variants': 'sizes', sizes: 'sizes', size: 'sizes',
  moq: 'moq',
  'lead days': 'leadTimeDays', 'lead time days': 'leadTimeDays', lead: 'leadTimeDays', leadtimedays: 'leadTimeDays', 'lead time': 'leadTimeDays',
  'eco': 'isEcoCertified', isecocertified: 'isEcoCertified', 'eco certified': 'isEcoCertified',
  'eco certification': 'ecoCertification', ecocertification: 'ecoCertification',
  hsn: 'hsnCode', 'hsn code': 'hsnCode', hsncode: 'hsnCode',
  'gst': 'gstPercent', 'gst percent': 'gstPercent', gstpercent: 'gstPercent',
  'print technique': 'printingTechnique', 'printing technique': 'printingTechnique', printtechnique: 'printingTechnique', printingtechnique: 'printingTechnique',
  'branding position': 'printingPosition', 'printing position': 'printingPosition', printingposition: 'printingPosition',
  'branding area': 'brandingArea', brandingarea: 'brandingArea',
  'sample': 'sampleAvailable', sampleavailable: 'sampleAvailable',
  'primary vendor': 'vendorName', vendor: 'vendorName', vendorname: 'vendorName', 'vendor name': 'vendorName',
  'vendor sku': 'vendorSku', vendorsku: 'vendorSku',
  'vendor moq': 'vendorMoq', vendormoq: 'vendorMoq',
  'vendor lead days': 'vendorLeadDays', 'vendor lead': 'vendorLeadDays', vendorleaddays: 'vendorLeadDays', 'vendor lead time': 'vendorLeadDays',
  'vendor cost': 'vendorCost', vendorcost: 'vendorCost',
  'alternate vendor': 'altVendorName', 'alt vendor': 'altVendorName', altvendorname: 'altVendorName',
  'sourcing status': 'sourcingStatus', sourcingstatus: 'sourcingStatus',
  'occasion tags': 'occasions', occasions: 'occasions', occasion: 'occasions',
  'recipient tags': 'recipientTags', recipienttags: 'recipientTags', recipient: 'recipientTags',
  'short description': 'descriptionShort', descriptionshort: 'descriptionShort', description: 'descriptionShort',
  'long description': 'descriptionLong', descriptionlong: 'descriptionLong',
  'product description': 'descriptionLong', 'full description': 'descriptionLong',
  'key features': 'keyFeatures', keyfeatures: 'keyFeatures', features: 'keyFeatures',
  specifications: 'specifications', specification: 'specifications', specs: 'specifications',
  'shipping delivery': 'shippingDelivery', 'shipping and delivery': 'shippingDelivery',
  'shipping & delivery': 'shippingDelivery',
  shippingdelivery: 'shippingDelivery', shipping: 'shippingDelivery',
  slug: 'slug',
  'image urls': 'imageUrls', imageurls: 'imageUrls', images: 'imageUrls', 'image url': 'imageUrls',
  'image folder': 'imageUrls', imagefolder: 'imageUrls', 'image links': 'imageUrls', 'image link': 'imageUrls',
  'product images': 'imageUrls', 'product image': 'imageUrls', 'image': 'imageUrls', photo: 'imageUrls', photos: 'imageUrls',
};

const RANGE_TO_TIER: Record<string, number> = {
  '1-24': 1, '25-49': 2, '50-99': 3, '100-249': 4, '250-499': 5, '500+': 6,
};
const DEFAULT_RANGES: Record<number, [number, number | null]> = {
  1: [1, 24], 2: [25, 49], 3: [50, 99], 4: [100, 249], 5: [250, 499], 6: [500, null],
};

function norm(s: any): string {
  return (s ?? '')
    .toString()
    .toLowerCase()
    .replace(/ /g, ' ')
    .replace(/[×✕]/g, 'x')
    .replace(/[–—]/g, '-')
    .replace(/[₹%?]/g, '')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Detect a tiered-price column from its (normalised) header
function tierFromHeader(n: string): { tier: number; kind: 'sell' | 'cost' } | null {
  let m = n.match(/^(\d+-\d+|\d+\+)\s+(sell|cost)/); // "1-24 sell ₹"
  if (m && m[1] && m[2]) {
    const tier = RANGE_TO_TIER[m[1]];
    if (tier) return { tier, kind: m[2] as 'sell' | 'cost' };
  }
  m = n.match(/^t(\d+)[_ ]?(sell|cost)\s*price/); // "t1_sellPrice"
  if (m && m[1] && m[2]) return { tier: Number(m[1]), kind: m[2] as 'sell' | 'cost' };
  return null;
}
function tierQtyFromHeader(n: string): { tier: number; kind: 'min' | 'max' } | null {
  const m = n.match(/^t(\d+)[_ ]?(min|max)\s*qty/);
  if (m && m[1] && m[2]) return { tier: Number(m[1]), kind: m[2] as 'min' | 'max' };
  return null;
}

const PRINTING_VALID = ['screen_print', 'uv_print', 'embroidery', 'laser_engraving', 'digital_print', 'emboss', 'none'];
function mapPrinting(value: string): string {
  const n = norm(value);
  if (!n) return 'none';
  if (PRINTING_VALID.includes(n.replace(/\s+/g, '_'))) return n.replace(/\s+/g, '_');
  if (n.includes('laser')) return 'laser_engraving';
  if (n.includes('uv')) return 'uv_print';
  if (n.includes('screen')) return 'screen_print';
  if (n.includes('embroider')) return 'embroidery';
  if (n.includes('emboss') || n.includes('deboss')) return 'emboss';
  if (n.includes('pad') || n.includes('dtf') || n.includes('foil') || n.includes('digital')) return 'digital_print';
  return 'none';
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

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  // Capture now — the null-narrowing above is lost inside the nested
  // runImport() closure, so we reference this stable id there instead.
  const userId = session.user.id;

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
      // Prefer a sheet named like "product" if present, else the first
      const sheetName =
        wb.SheetNames.find((s) => /product|master|catalog/i.test(s)) || wb.SheetNames[0];
      const sheet = sheetName ? wb.Sheets[sheetName] : undefined;
      if (!sheet) return NextResponse.json({ error: 'The Excel file has no sheets' }, { status: 400 });
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false, defval: '' });
      matrix = rows.map((r) => (Array.isArray(r) ? r.map((c) => (c == null ? '' : String(c))) : []));
    } else {
      matrix = parseCsv(await file.text());
    }
  } catch (err) {
    console.error('Could not read upload:', err);
    return NextResponse.json({ error: 'Could not read uploaded file' }, { status: 400 });
  }

  matrix = matrix.filter((r) => r.some((c) => (c ?? '').trim() !== ''));
  if (matrix.length < 2) {
    return NextResponse.json({ error: 'File must have a header row and at least one product row' }, { status: 400 });
  }

  // ── Detect the header row (sheets often have title/group rows above it) ──
  const scoreRow = (cells: string[]) => {
    let s = 0;
    for (const c of cells) {
      const n = norm(c);
      if (!n) continue;
      if (ALIASES[n] || tierFromHeader(n)) s++;
    }
    return s;
  };
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

  // Build field→column and tier→columns maps from the header row
  const fieldCol: Record<string, number> = {};
  const tierCols: Record<number, { sell?: number; cost?: number; min?: number; max?: number }> = {};
  headerRow.forEach((h, i) => {
    const n = norm(h);
    if (!n) return;
    const t = tierFromHeader(n);
    if (t) { (tierCols[t.tier] = tierCols[t.tier] || {})[t.kind] = i; return; }
    const q = tierQtyFromHeader(n);
    if (q) { (tierCols[q.tier] = tierCols[q.tier] || {})[q.kind] = i; return; }
    const field = ALIASES[n];
    if (field && fieldCol[field] === undefined) fieldCol[field] = i;
  });

  if (fieldCol['name'] === undefined || fieldCol['sku'] === undefined) {
    return NextResponse.json(
      {
        error:
          'Could not find the product columns. Make sure the sheet has "Product Name" (or name) and "Product ID" (or sku) columns.',
      },
      { status: 400 }
    );
  }

  // ── Caches ──
  const hsnCache = new Map<string, any>();
  const categoryCache = new Map<string, string>();
  const occasionCache = new Map<string, string>();
  const vendorCache = new Map<string, string>();

  async function getOrCreateHsn(code: string, gstPct: number | null) {
    const key = code.trim();
    if (hsnCache.has(key)) return hsnCache.get(key);
    let hsn = await prisma.hsnCode.findUnique({ where: { code: key } });
    if (!hsn) {
      try {
        hsn = await prisma.hsnCode.create({
          data: {
            code: key,
            description: `Imported HSN ${key}`,
            defaultGstRate: new Prisma.Decimal(gstPct ?? 18),
          },
        });
      } catch {
        hsn = await prisma.hsnCode.findUnique({ where: { code: key } });
      }
    }
    hsnCache.set(key, hsn);
    return hsn;
  }
  async function getOrCreateCategory(name: string, parentId?: string): Promise<string> {
    const cacheKey = `${parentId || ''}:${name.toLowerCase()}`;
    if (categoryCache.has(cacheKey)) return categoryCache.get(cacheKey)!;
    let cat = await prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, ...(parentId ? { parentId } : {}) },
    });
    if (!cat) {
      try {
        cat = await prisma.category.create({
          data: { name, slug: slugify(name) || `cat-${Date.now().toString(36)}`, parentId: parentId || null },
        });
      } catch {
        cat = await prisma.category.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
      }
    }
    categoryCache.set(cacheKey, cat!.id);
    return cat!.id;
  }
  async function getOrCreateOccasion(name: string): Promise<string> {
    const key = name.toLowerCase();
    if (occasionCache.has(key)) return occasionCache.get(key)!;
    let occ = await prisma.occasionConfig.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
    if (!occ) {
      try {
        occ = await prisma.occasionConfig.create({ data: { name, slug: slugify(name) || `occ-${Date.now().toString(36)}` } });
      } catch {
        occ = await prisma.occasionConfig.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
      }
    }
    occasionCache.set(key, occ!.id);
    return occ!.id;
  }
  async function getOrCreateVendor(name: string): Promise<string> {
    const key = name.toLowerCase();
    if (vendorCache.has(key)) return vendorCache.get(key)!;
    let vendor = await prisma.vendor.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
    if (!vendor) {
      try {
        vendor = await prisma.vendor.create({
          data: { name, slug: slugify(name) || `vendor-${Date.now().toString(36)}`, onboardingStatus: 'to_approach', source: 'admin' },
        });
      } catch {
        vendor = await prisma.vendor.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
      }
    }
    vendorCache.set(key, vendor!.id);
    return vendor!.id;
  }

  const errors: { row: number; sku: string; message: string }[] = [];
  let created = 0;

  // Stream NDJSON progress so the client can show a real progress bar
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: any) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      send({ type: 'start', total: dataRows.length });

      await runImport(send);

      send({ type: 'done', success: true, created, failed: errors.length, total: dataRows.length, errors });
      controller.close();
    },
  });

  async function runImport(send: (obj: any) => void) {
  for (let r = 0; r < dataRows.length; r++) {
    const cells = dataRows[r] ?? [];
    const cell = (i?: number) => (i !== undefined && i < cells.length ? (cells[i] ?? '').trim() : '');
    const get = (field: string) => cell(fieldCol[field]);
    const rowNum = headerIdx + 2 + r;
    const sku = get('sku');
    const name = get('name');

    try {
      if (!name || !sku) {
        errors.push({ row: rowNum, sku, message: 'Missing required name or sku' });
        continue;
      }
      if (await prisma.product.findUnique({ where: { sku } })) {
        errors.push({ row: rowNum, sku, message: 'SKU already exists — skipped' });
        continue;
      }

      // Price tiers
      const gstPct = toNum(get('gstPercent'));
      const tiers: { tier: number; minQty: number; maxQty: number | null; costPrice: number; sellPrice: number }[] = [];
      for (let t = 1; t <= 6; t++) {
        const tc = tierCols[t];
        if (!tc) continue;
        const sell = toNum(cell(tc.sell));
        const cost = toNum(cell(tc.cost));
        if (sell == null && cost == null) continue;
        const minQty = tc.min !== undefined ? toNum(cell(tc.min)) : null;
        const maxQty = tc.max !== undefined ? toNum(cell(tc.max)) : null;
        tiers.push({
          tier: t,
          minQty: minQty ?? DEFAULT_RANGES[t]?.[0] ?? 1,
          maxQty: tc.max !== undefined ? maxQty : (DEFAULT_RANGES[t]?.[1] ?? null),
          costPrice: cost ?? 0,
          sellPrice: sell ?? 0,
        });
      }
      if (tiers.length === 0) {
        errors.push({ row: rowNum, sku, message: 'No price tiers found' });
        continue;
      }

      // HSN (auto-created from sheet HSN + GST% if missing); optional if blank
      const hsnCode = get('hsnCode');
      const hsn = hsnCode ? await getOrCreateHsn(hsnCode, gstPct) : null;

      // Dimensions: explicit columns or parsed from "7×7×26 cm"
      let L = toNum(get('lengthCm'));
      let W = toNum(get('widthCm'));
      let H = toNum(get('heightCm'));
      if (L == null && W == null && H == null) {
        const nums = (get('dimensions').match(/[\d.]+/g) || []).map(Number);
        if (nums.length >= 1) L = nums[0] ?? null;
        if (nums.length >= 2) W = nums[1] ?? null;
        if (nums.length >= 3) H = nums[2] ?? null;
      }

      const statusRaw = get('status').toLowerCase();
      const status = VALID_STATUS.includes(statusRaw) ? statusRaw : 'active';

      const variants: { kind: string; value: string; sortOrder: number }[] = [];
      toList(get('colors')).forEach((value, i) => variants.push({ kind: 'color', value, sortOrder: i }));
      toList(get('sizes')).forEach((value, i) => variants.push({ kind: 'size', value, sortOrder: variants.length + i }));

      const recipientTags = toList(get('recipientTags'));
      const imageUrls = toList(get('imageUrls'));

      const product = await prisma.product.create({
        data: {
          name,
          slug: slugify(get('slug') || name) || `product-${Date.now().toString(36)}-${r}`,
          sku,
          brand: get('brand') || null,
          descriptionShort: get('descriptionShort') || null,
          descriptionLong: get('descriptionLong') || null,
          // Content-tab fields. Stored as authored — plain text from the sheet is
          // normalised to HTML at render time by toRichHtml().
          keyFeatures: get('keyFeatures') || null,
          specifications: get('specifications') || null,
          shippingDelivery: get('shippingDelivery') || null,
          material: get('material') || null,
          weightG: toNum(get('weightG')),
          dimensionL: L,
          dimensionW: W,
          dimensionH: H,
          ...(toNum(get('moq')) != null && { moq: toNum(get('moq'))! }),
          ...(toNum(get('leadTimeDays')) != null && { leadTimeDays: toNum(get('leadTimeDays'))! }),
          ...(toNum(get('sortOrder')) != null && { sortOrder: toNum(get('sortOrder'))! }),
          status: status as any,
          printingTechnique: mapPrinting(get('printingTechnique')) as any,
          printingPosition: get('printingPosition') || null,
          brandingArea: get('brandingArea') || null,
          isEcoCertified: toBool(get('isEcoCertified')),
          ecoCertification: get('ecoCertification') || null,
          sampleAvailable: toBool(get('sampleAvailable')),
          isFeatured: toBool(get('isFeatured')),
          ...(recipientTags.length && { recipientTags }),
          priceTiers: {
            createMany: {
              data: tiers.map((t) => ({
                tier: t.tier,
                minQty: t.minQty,
                maxQty: t.maxQty,
                costPrice: new Prisma.Decimal(t.costPrice),
                sellPrice: new Prisma.Decimal(t.sellPrice),
              })),
            },
          },
          ...(hsn && { hsn: { create: { hsnId: hsn.id, gstRate: hsn.defaultGstRate } } }),
          ...(variants.length && { variants: { createMany: { data: variants } } }),
          ...(imageUrls.length && {
            images: { createMany: { data: imageUrls.map((url, i) => ({ url, isPrimary: i === 0 })) } },
          }),
        },
      });

      // Categories
      const categoryName = get('category');
      if (categoryName) {
        const catId = await getOrCreateCategory(categoryName);
        await prisma.productCategory.create({ data: { productId: product.id, categoryId: catId } }).catch(() => {});
        const subName = get('subcategory');
        if (subName) {
          const subId = await getOrCreateCategory(subName, catId);
          await prisma.productCategory.create({ data: { productId: product.id, categoryId: subId } }).catch(() => {});
        }
      }

      // Occasions
      for (const occName of toList(get('occasions'))) {
        const occId = await getOrCreateOccasion(occName);
        await prisma.productOccasion.create({ data: { productId: product.id, occasionId: occId } }).catch(() => {});
      }

      // Vendors (primary + optional alternate)
      const primaryVendor = get('vendorName');
      if (primaryVendor) {
        const vendorId = await getOrCreateVendor(primaryVendor);
        await prisma.productVendor.create({
          data: {
            productId: product.id,
            vendorId,
            isPrimary: true,
            costPrice: toNum(get('vendorCost')) != null ? new Prisma.Decimal(toNum(get('vendorCost'))!) : null,
            vendorSku: get('vendorSku') || null,
            vendorMoq: toNum(get('vendorMoq')),
            vendorLeadDays: toNum(get('vendorLeadDays')),
            sourcingStatus: get('sourcingStatus') || null,
          },
        }).catch(() => {});
      }
      const altVendor = get('altVendorName');
      if (altVendor && altVendor.toLowerCase() !== primaryVendor.toLowerCase()) {
        const vendorId = await getOrCreateVendor(altVendor);
        await prisma.productVendor.create({ data: { productId: product.id, vendorId, isPrimary: false } }).catch(() => {});
      }

      // Price audit log
      await prisma.priceAuditLog.createMany({
        data: tiers.map((t) => ({
          productId: product.id,
          tier: t.tier,
          newCost: new Prisma.Decimal(t.costPrice),
          newSell: new Prisma.Decimal(t.sellPrice),
          changedBy: userId,
          reason: 'Bulk import',
        })),
      });

      created++;
    } catch (err: any) {
      errors.push({
        row: rowNum,
        sku,
        message: err?.code === 'P2002' ? 'Duplicate value (SKU/slug already exists)' : (err?.message || 'Failed to create'),
      });
    } finally {
      send({ type: 'progress', current: r + 1, total: dataRows.length, created, failed: errors.length });
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
