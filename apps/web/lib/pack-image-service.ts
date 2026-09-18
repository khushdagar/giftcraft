import sharp from 'sharp';
import { nanoid } from 'nanoid';
import { prisma } from '@/lib/prisma';
import { stripHtml } from '@/lib/strip-html';
import { generatePackImage, PackImageError, PACK_IMAGE_MODEL, formatSizeCm } from '@/lib/gemini-pack-image';
import { PRINTING_TECHNIQUE_LABELS } from '@/lib/pack-image-prompt';
import { uploadBuffer, getBucketAndCdn } from '@/lib/upload-to-digital-ocean';
import { PACK_IMAGE_FOLDER } from '@/lib/proposal-pack';
import { PACKAGING_SIZE_SUFFIX } from '@/lib/packaging-designs';
import { resolveBoxFit } from '@/lib/box-fit';

/**
 * The ONE place an AI pack shot (chosen box with the products packed inside,
 * client logo applied) is produced. Every proposal surface goes through it, so
 * the admin proposal builder, a customer's checkout deck and a placed order's
 * deck all get the same Gemini prompt, the same post-processing and the same
 * record in the Generated Images tab.
 */

const imageSelect = {
  select: { url: true },
  orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }],
  take: 1,
};

/** The generator accepts at most this many products in one shot. */
export const PACK_IMAGE_MAX_PRODUCTS = 20;

/** One row of the mockup tool's manual BRANDING MAP. */
export interface BrandingRule {
  /** true = apply the logo, false = never apply it. No rule = follow the catalogue. */
  apply: boolean;
  /** Free text, e.g. "Laser engraving". Falls back to the catalogue method. */
  technique?: string | null;
  /** e.g. "white", "gold foil", "#1A3C6E". */
  logoColour?: string | null;
  /** e.g. "front centre", "cap". Falls back to the catalogue position. */
  position?: string | null;
}

/** A product that is not in the catalogue — an uploaded reference photo plus a name. */
export interface CustomPackItem {
  /** Client-side key, used to address this item in the branding map. */
  key: string;
  name: string;
  /** Must be on our own CDN (uploaded through /api/upload). */
  imageUrl: string;
}

const BEST_FIT_TECHNIQUE = 'Best-fit branding method for its material';

export interface CreatePackImageInput {
  productIds: string[];
  /** Uploaded, non-catalogue products (mockup tool). Packed after the catalogue products. */
  customItems?: CustomPackItem[];
  /** Manual branding map keyed by product id or custom item key. Overrides the catalogue. */
  brandingMap?: Record<string, BrandingRule>;
  /** Brand colour for the box. Omit to keep the colour of the box photo. */
  boxColour?: string | null;
  /** Packaging product id; a `<id>-<size>` builder snapshot id is accepted. */
  boxId?: string | null;
  /** Client logo — only URLs on our own CDN are used (it is fetched server-side). */
  logoUrl?: string | null;
  /** Recorded with the image for the Generated Images tab. */
  packLabel?: string | null;
  companyName?: string | null;
  createdById?: string | null;
}

/**
 * Generate, store and record one pack image. Returns its CDN URL.
 * Throws PackImageError for generator problems (missing key, model refusal…).
 */
export async function createPackImage(input: CreatePackImageInput): Promise<string> {
  return (await createPackImageDetailed(input)).url;
}

/** Same as createPackImage, plus the products kept out of the shot because they don't go in a box. */
export async function createPackImageDetailed(
  input: CreatePackImageInput
): Promise<{ url: string; leftOut: string[] }> {
  const productIds = input.productIds.filter(Boolean).slice(0, PACK_IMAGE_MAX_PRODUCTS);
  const boxId =
    input.boxId && input.boxId !== 'no-box'
      ? input.boxId.replace(PACKAGING_SIZE_SUFFIX, '')
      : null;

  const [products, box] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        brand: true,
        material: true,
        descriptionShort: true,
        dimensionL: true,
        dimensionW: true,
        dimensionH: true,
        printingTechnique: true,
        printingPosition: true,
        images: imageSelect,
      },
    }),
    boxId
      ? prisma.product.findUnique({
          where: { id: boxId },
          select: {
            name: true,
            descriptionShort: true,
            images: imageSelect,
          },
        })
      : null,
  ]);
  // Reference photos are downloaded server-side, so only our own CDN is accepted.
  const { cdnEndpoint } = getBucketAndCdn();
  const onCdn = (url?: string | null) => !!url && url.startsWith(`${cdnEndpoint}/`);
  const logoUrl = onCdn(input.logoUrl) ? input.logoUrl! : null;

  // Keep the pick order — the prompt lists items in this order.
  const byId = new Map(products.map((p) => [p.id, p]));
  const selected = productIds.map((id) => byId.get(id)).filter((p) => !!p);
  // With a box chosen, products that do not fit it are not drawn — a trolley
  // cannot be packed into it. Without a box (order decks) everything is shown.
  const fit = await resolveBoxFit(
    selected.map((p) => p.id),
    box ? boxId : null,
    input.customItems?.length ?? 0
  );
  const ordered = selected.filter((p) => fit.insideIds.includes(p.id));
  const leftOut = fit.outside.map((p) => p.name);
  const customItems = (input.customItems ?? [])
    .filter((c) => c.name.trim() && onCdn(c.imageUrl))
    .slice(0, Math.max(0, PACK_IMAGE_MAX_PRODUCTS - ordered.length));
  if (ordered.length + customItems.length === 0) {
    throw new PackImageError(
      leftOut.length > 0
        ? 'Every selected product is too large for the selected box, so there is nothing to pack into it'
        : 'No valid products selected'
    );
  }

  // Manual branding map (mockup tool) wins over the catalogue branding method.
  const clean = (v?: string | null) => v?.replace(/s+/g, ' ').trim().slice(0, 80) || null;
  const resolveBranding = (
    key: string,
    catalogue: { technique: string; position?: string | null } | null
  ) => {
    const rule = input.brandingMap?.[key];
    if (!rule) return catalogue;
    if (!rule.apply) return null;
    return {
      technique: clean(rule.technique) ?? catalogue?.technique ?? BEST_FIT_TECHNIQUE,
      position: clean(rule.position) ?? catalogue?.position ?? null,
      logoColour: clean(rule.logoColour),
    };
  };
  const boxColour = clean(input.boxColour);

  const raw = await generatePackImage({
    logoUrl,
    boxColour,
    boxInnerCm: fit.boxInner,
    box: box
      ? {
          name: box.name,
          description: stripHtml(box.descriptionShort || '').trim().slice(0, 400) || null,
          imageUrl: box.images[0]?.url,
        }
      : null,
    products: [
      ...ordered.map((p) => ({
      name: p.name,
      brand: p.brand,
      material: p.material,
      // Catalogue copy often states shape/finish the photo leaves ambiguous.
      description: stripHtml(p.descriptionShort || '').replace(/\s+/g, ' ').trim().slice(0, 240) || null,
      size: formatSizeCm(p.dimensionL, p.dimensionW, p.dimensionH),
      dims:
        p.dimensionL && p.dimensionW && p.dimensionH
          ? ([p.dimensionL, p.dimensionW, p.dimensionH] as [number, number, number])
          : null,
      imageUrl: p.images[0]?.url,
      // Only products with a branding method get the client logo — unless the
      // manual branding map says otherwise.
      branding: resolveBranding(
        p.id,
        p.printingTechnique && p.printingTechnique !== 'none'
          ? {
              technique: PRINTING_TECHNIQUE_LABELS[p.printingTechnique] ?? p.printingTechnique,
              position: p.printingPosition,
            }
          : null
      ),
      })),
      // Uploaded products: no catalogue data, so branded only when the map says so.
      ...customItems.map((c) => ({
        name: c.name.trim().slice(0, 120),
        imageUrl: c.imageUrl,
        branding: resolveBranding(c.key, null),
      })),
    ],
  });

  // JPEG keeps the deck PDF light; 1600px is plenty for a half-page A4 hero.
  const jpeg = await sharp(raw)
    .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer();
  const url = await uploadBuffer(`${PACK_IMAGE_FOLDER}/${Date.now()}-${nanoid(8)}.jpg`, jpeg, 'image/jpeg');

  // Record it for the Generated Images tab. Best-effort: the image is already
  // stored, so a failed insert must not fail the generation.
  try {
    await prisma.generatedPackImage.create({
      data: {
        url,
        packLabel: input.packLabel?.trim() || null,
        companyName: input.companyName?.trim() || null,
        boxName: box?.name ?? null,
        productNames: [...ordered.map((p) => p.name), ...customItems.map((c) => c.name.trim())],
        logoUrl,
        model: PACK_IMAGE_MODEL,
        createdById: input.createdById ?? null,
      },
    });
  } catch (err) {
    console.error('Failed to record generated pack image:', err);
  }

  return { url, leftOut };
}

// ── Generate-once helpers for quotes and orders ────────────────────────────

/** Concurrent requests for the same quote/order share one generation. */
const inFlight = new Map<string, Promise<string | null>>();
/** After a failure, wait this long before trying the same key again. */
const FAILURE_COOLDOWN_MS = 10 * 60 * 1000;
const failedAt = new Map<string, number>();

async function once(key: string, run: () => Promise<string>): Promise<string | null> {
  const last = failedAt.get(key);
  if (last && Date.now() - last < FAILURE_COOLDOWN_MS) return null;

  const running = inFlight.get(key);
  if (running) return running;

  const job = run()
    .catch((err) => {
      failedAt.set(key, Date.now());
      console.error(`Pack image generation failed for ${key}:`, err);
      return null;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, job);
  return job;
}

/**
 * The quote's AI pack image — generated on first request and then kept on the
 * quote payload as `packImageUrl` (the field admin proposals already use, and
 * the one the deck renderer reads). Returns null when it cannot be produced;
 * the deck simply renders without the pack showcase photo.
 */
export async function ensureQuotePackImage(quoteId: string): Promise<string | null> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: {
      id: true,
      payload: true,
      createdById: true,
      company: { select: { name: true } },
    },
  });
  const payload = (quote?.payload ?? null) as any;
  if (!quote || !payload) return null;
  if (typeof payload.packImageUrl === 'string' && payload.packImageUrl) return payload.packImageUrl;

  const productIds: string[] = Array.isArray(payload.products)
    ? payload.products.map((p: any) => p?.id).filter(Boolean)
    : [];
  if (productIds.length === 0) return null;

  return once(`quote:${quote.id}`, async () => {
    const url = await createPackImage({
      productIds,
      boxId: payload.packaging?.id ?? null,
      logoUrl: payload.logoUrl ?? null,
      packLabel: `Quote #${quote.id.slice(0, 8).toUpperCase()}`,
      companyName: quote.company?.name || payload.address?.company || null,
      createdById: quote.createdById,
    });
    // Re-read before writing so a payload edited meanwhile is not clobbered.
    const fresh = await prisma.quote.findUnique({ where: { id: quote.id }, select: { payload: true } });
    await prisma.quote.update({
      where: { id: quote.id },
      data: { payload: { ...((fresh?.payload ?? payload) as any), packImageUrl: url } },
    });
    return url;
  });
}

const orderLabel = (orderNumber: string) => `Order ${orderNumber}`;

/** The pack image already generated for a placed order, if any. */
export async function findOrderPackImage(orderNumber: string): Promise<string | null> {
  const row = await prisma.generatedPackImage.findFirst({
    where: { packLabel: orderLabel(orderNumber) },
    orderBy: { createdAt: 'desc' },
    select: { url: true },
  });
  return row?.url ?? null;
}

/**
 * The order's AI pack image — generated on first request. Orders keep packaging
 * as a total rather than a line item, so the shot shows the products (with the
 * client logo) without a specific box. Cached via the Generated Images record.
 */
export async function ensureOrderPackImage(orderId: string, requestedById: string | null): Promise<string | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      logoUrl: true,
      company: { select: { name: true } },
      items: { select: { productId: true } },
    },
  });
  if (!order) return null;

  const existing = await findOrderPackImage(order.orderNumber);
  if (existing) return existing;

  const productIds = [...new Set(order.items.map((i) => i.productId).filter(Boolean))] as string[];
  if (productIds.length === 0) return null;

  return once(`order:${order.id}`, () =>
    createPackImage({
      productIds,
      boxId: null,
      logoUrl: order.logoUrl,
      packLabel: orderLabel(order.orderNumber),
      companyName: order.company?.name ?? null,
      createdById: requestedById,
    })
  );
}
