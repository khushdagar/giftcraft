import sharp from 'sharp';
import { buildPackImagePrompt, boxEditLead, boxFinalCheck, boxConstruction } from '@/lib/pack-image-prompt';

/**
 * AI pack shot for proposal decks.
 *
 * Sends Gemini the chosen gift box and every product's catalogue photo, and asks
 * for ONE studio photograph of that box, open, with the products packed inside.
 * The result is the hero image on each pack's page in the proposal PDF.
 *
 * Plain REST via fetch (no SDK). Model is overridable so a newer image model can
 * be swapped in from the environment without a deploy of code.
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
// 2.5 Flash Image — the low-cost model. On its own it tends to swap in a
// generic box, so the request is framed as an EDIT of the box photo (see parts
// below), which keeps the selected box intact.
export const PACK_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const MODEL = PACK_IMAGE_MODEL;
const GENERATE_TIMEOUT_MS = 100_000;

export interface PackImageItem {
  name: string;
  description?: string | null;
  brand?: string | null;
  imageUrl?: string | null;
  /** Catalogue material — sent with the product so its shape and finish stay true. */
  material?: string | null;
  /** Real size, e.g. "7 × 7 × 24 cm (L × W × H)" — pins shape and relative scale. */
  size?: string | null;
  /** Catalogue branding method — only products with one receive the client logo. */
  branding?: { technique: string; position?: string | null } | null;
}

export class PackImageError extends Error {}

/** Catalogue dimensions (cm) as a prompt phrase, or null when any are missing. */
export function formatSizeCm(
  l: number | null | undefined,
  w: number | null | undefined,
  h: number | null | undefined
): string | null {
  if (!(l && w && h)) return null;
  const n = (v: number) => String(Math.round(v * 10) / 10);
  return `${n(l)} × ${n(w)} × ${n(h)} cm (L × W × H)`;
}

type InlinePart = { inlineData: { mimeType: string; data: string } };

/**
 * Download a reference photo and normalise it to a ≤1024px JPEG on white —
 * keeps the request small and gives the model a consistent input (the product
 * library mixes webp/avif/transparent PNG cut-outs).
 */
async function toInlinePart(url: string | null | undefined): Promise<InlinePart | null> {
  if (!url) return null;
  const absolute = url.startsWith('http')
    ? url
    : `${process.env.NEXT_PUBLIC_APP_URL || ''}${url.startsWith('/') ? '' : '/'}${url}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(absolute, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    if (input.length === 0) return null;
    const jpeg = await sharp(input)
      .flatten({ background: '#FFFFFF' })
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return { inlineData: { mimeType: 'image/jpeg', data: jpeg.toString('base64') } };
  } catch {
    return null; // a missing reference photo degrades to name-only for that item
  }
}

/** Generate the pack shot. Returns the raw image bytes Gemini produced. */
export async function generatePackImage({
  box,
  products,
  logoUrl,
}: {
  box: PackImageItem | null;
  products: PackImageItem[];
  /** Client logo — printed on the box lid. Omit to keep the box artwork as photographed. */
  logoUrl?: string | null;
}): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new PackImageError('GEMINI_API_KEY is not configured');
  if (products.length === 0) throw new PackImageError('No products to pack');

  const [boxPart, productParts, logoPart] = await Promise.all([
    toInlinePart(box?.imageUrl),
    Promise.all(products.map((p) => toInlinePart(p.imageUrl))),
    toInlinePart(logoUrl),
  ]);
  // The logo goes on the box lid (when there is a box) and on branded products.
  const hasLogo = !!logoPart;
  const brandedNames = products.filter((p) => p.branding).map((p) => p.name);

  const prompt = buildPackImagePrompt({
    boxName: box?.name ?? null,
    boxDescription: box?.description ?? null,
    hasLogo,
    hasBoxImage: !!boxPart,
    products: products.map((p, i) => ({
      label: p.brand ? `${p.name} (${p.brand})` : p.name,
      hasImage: !!productParts[i],
      material: p.material ?? null,
      branding: p.branding ?? null,
    })),
  });
  const productLabels = products.map((p) => (p.brand ? `${p.name} (${p.brand})` : p.name));
  // Slider / hinged / lid-and-base — every box instruction follows the real construction.
  const construction = boxConstruction(box?.name, box?.description);

  // The box photo goes FIRST and the task is framed as editing it. Image models
  // preserve an image they are editing far better than one they merely
  // reference — without this the selected box was replaced by a generic one.
  // Each product is labelled right before its image; numbering matches the
  // prompt's reference list (box = Image 1).
  const parts: ({ text: string } | InlinePart)[] = [];
  let imageNo = 0;
  if (boxPart) {
    parts.push(boxPart, { text: boxEditLead(products.length, hasLogo, construction) });
    imageNo = 1;
  }
  productParts.forEach((part, i) => {
    if (part) {
      parts.push(
        {
          // Catalogue photos are styled: several colour variants in one shot,
          // coffee in a mug, a detachable lid lying beside it, pencils in a
          // stand. Each label pins the photo to ONE unit of ONE exact product.
          text: `Image ${++imageNo} — PRODUCT ${i + 1} of ${products.length}: ${productLabels[i]}${
            products[i]!.material ? ` (material: ${products[i]!.material})` : ''
          }.${products[i]!.size ? `\nReal size: ${products[i]!.size} — keep this shape and scale relative to the other products.` : ''}${
            products[i]!.description ? `\nCatalogue description: ${products[i]!.description}` : ''
          }
This photo shows the EXACT product to use. Place exactly ONE unit of it in the box, identical to this photo in shape, proportions, colour, material and details — not a similar or generic version.
If the photo shows several units or colour variants, use only one of them. A lid, cap, gift box, sleeve or tin shown with it is part of this same ONE product — keep those pieces together as one item. Ignore the photo's background and any props that are not part of the product.`,
        },
        part
      );
    }
  });
  if (hasLogo && logoPart) {
    parts.push(
      {
        text: `Image ${++imageNo} — CLIENT LOGO: print this exact logo on the box lid${
          brandedNames.length > 0 ? ` and on these products only: ${brandedNames.join(', ')}` : ' only'
        }.`,
      },
      logoPart
    );
  }
  parts.push({ text: prompt });
  if (boxPart) {
    parts.push({ text: boxFinalCheck({ hasLogo, brandedProducts: brandedNames, productLabels, construction }) });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          // Lower than the default (1.0): less "creative" reinterpretation of
          // the reference products.
          temperature: 0.4,
          // Near-square to match the left-hand image frame on the deck page.
          imageConfig: { aspectRatio: '5:4' },
        },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) throw new PackImageError('Image generation timed out');
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const json = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    console.error('[gemini-pack-image] API error', res.status, json?.error?.message);
    throw new PackImageError(json?.error?.message || `Gemini request failed (${res.status})`);
  }

  const candidate = json?.candidates?.[0];
  const imagePart = (candidate?.content?.parts ?? []).find(
    (p: any) => p?.inlineData?.data || p?.inline_data?.data
  );
  const data: string | undefined = imagePart?.inlineData?.data ?? imagePart?.inline_data?.data;
  if (!data) {
    const reason = candidate?.finishReason || json?.promptFeedback?.blockReason || 'no image returned';
    throw new PackImageError(`Gemini did not return an image (${reason})`);
  }
  return Buffer.from(data, 'base64');
}
