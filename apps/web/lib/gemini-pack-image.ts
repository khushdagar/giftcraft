import sharp from 'sharp';
import { buildPackImagePrompt, boxEditLead, boxFinalCheck } from '@/lib/pack-image-prompt';

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
  /** Catalogue branding method — only products with one receive the client logo. */
  branding?: { technique: string; position?: string | null } | null;
}

export class PackImageError extends Error {}

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
      branding: p.branding ?? null,
    })),
  });

  // The box photo goes FIRST and the task is framed as editing it. Image models
  // preserve an image they are editing far better than one they merely
  // reference — without this the selected box was replaced by a generic one.
  // Each product is labelled right before its image; numbering matches the
  // prompt's reference list (box = Image 1).
  const parts: ({ text: string } | InlinePart)[] = [];
  let imageNo = 0;
  if (boxPart) {
    parts.push(boxPart, { text: boxEditLead(box?.name ?? 'gift box', products.length, hasLogo) });
    imageNo = 1;
  }
  productParts.forEach((part, i) => {
    if (part) {
      parts.push(
        {
          // Catalogue photos are often styled with props (a pen stand full of
          // notebooks and pencils) — only the named product may be used.
          text: `Image ${++imageNo} — PRODUCT ${i + 1}: ${products[i]!.name}. Use ONLY this product itself; ignore any props, contents or accessories styled with it in the photo.`,
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
  if (boxPart) parts.push({ text: boxFinalCheck(hasLogo, brandedNames) });

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
