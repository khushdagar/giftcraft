import sharp, { type Sharp, type Metadata } from 'sharp';

/**
 * Server-side image processing pipeline (source of truth).
 *
 * Every image that reaches storage passes through here first: it is validated
 * by magic bytes, auto-rotated, stripped of EXIF, converted to WebP, and
 * emitted as a set of responsive variants plus a tiny blur placeholder.
 *
 * Tunable via env: IMAGE_QUALITY (photo quality) and IMAGE_MAX_WIDTH.
 */

// Photo quality (0-100). Graphics/text images are bumped up automatically.
const PHOTO_QUALITY = clampInt(process.env.IMAGE_QUALITY, 80, 1, 100);
const GRAPHIC_QUALITY = Math.min(PHOTO_QUALITY + 10, 100);

// Longest-edge ceiling for the primary (full-size) variant. Never upscales.
const MAX_WIDTH = clampInt(process.env.IMAGE_MAX_WIDTH, 2000, 320, 8000);

// Responsive widths generated for srcset. Any width >= source width is skipped
// so we never upscale. The primary output is capped at MAX_WIDTH separately.
const RESPONSIVE_WIDTHS = [320, 640, 1024, 1600];

// Reject anything larger than this before we even decode it.
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

// Accepted input formats, keyed by the format string sharp/the magic-byte
// sniffer reports. heic/heif is decoded to WebP when the sharp build supports it.
const ACCEPTED_FORMATS = new Set(['jpeg', 'jpg', 'png', 'webp', 'avif', 'heif', 'heic']);

export interface ProcessedVariant {
  width: number;
  buffer: Buffer;
  /** Suffix appended to the object key, e.g. "-640w". Empty for the primary. */
  suffix: string;
}

export interface ProcessedImage {
  /** Full-size WebP (capped at MAX_WIDTH). This is the canonical stored file. */
  primary: Buffer;
  /** Responsive downscales (320/640/1024/1600), never larger than the source. */
  variants: ProcessedVariant[];
  /** ~10px base64 data URL for next/image placeholder="blur". */
  blurDataURL: string;
  /** Always "image/webp" — output format is normalized. */
  contentType: string;
  /** File extension for the stored key, always "webp". */
  extension: string;
  width: number;
  height: number;
}

export class ImageValidationError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ImageValidationError';
    this.status = status;
  }
}

/**
 * Detect the real image format from the buffer's magic bytes. Never trusts the
 * client-sent MIME type or the file extension. Returns a normalized format
 * string, or null if the bytes don't match a known image container.
 */
export function sniffImageFormat(buf: Buffer): string | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return 'png';
  }

  // RIFF....WEBP
  if (
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }

  // ISO-BMFF "ftyp" box (offset 4). Brand tells AVIF vs HEIC/HEIF apart.
  if (buf.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buf.toString('ascii', 8, 12);
    if (brand === 'avif' || brand === 'avis') return 'avif';
    if (
      brand === 'heic' || brand === 'heix' || brand === 'hevc' ||
      brand === 'mif1' || brand === 'msf1' || brand === 'heim' || brand === 'heis'
    ) {
      return 'heif';
    }
  }

  return null;
}

/**
 * Run the full pipeline on a raw upload buffer.
 *
 * @param input      Raw file bytes.
 * @param hasText    True for logos/graphics/text where higher quality matters.
 * @throws ImageValidationError on oversize, unknown, or corrupt input.
 */
export async function processImage(
  input: Buffer,
  { hasText = false }: { hasText?: boolean } = {},
): Promise<ProcessedImage> {
  if (input.length > MAX_INPUT_BYTES) {
    throw new ImageValidationError(
      `Image is too large (${(input.length / 1024 / 1024).toFixed(1)}MB). Maximum is 15MB.`,
    );
  }

  const format = sniffImageFormat(input);
  if (!format || !ACCEPTED_FORMATS.has(format)) {
    throw new ImageValidationError(
      'Unsupported file type. Allowed formats: JPEG, PNG, WebP, AVIF, HEIC.',
    );
  }

  const quality = hasText ? GRAPHIC_QUALITY : PHOTO_QUALITY;

  // Decode once, bake in orientation before we strip metadata, and keep the
  // pipeline reusable via clone(). rotate() with no args reads the EXIF
  // orientation tag and applies it; failOn:'none' tolerates minor corruption.
  let base: Sharp;
  let meta: Metadata;
  try {
    base = sharp(input, { failOn: 'none' }).rotate();
    meta = await base.metadata();
  } catch (err) {
    // HEIC input on a sharp build without libheif lands here.
    if (format === 'heif' || format === 'heic') {
      throw new ImageValidationError(
        'HEIC image could not be decoded on this server. See README (HEIC support).',
        422,
      );
    }
    throw new ImageValidationError('Image appears to be corrupt or unreadable.', 422);
  }

  const srcWidth = meta.width ?? MAX_WIDTH;
  const srcHeight = meta.height ?? 0;
  const hasAlpha = Boolean(meta.hasAlpha);

  // WebP handles transparency natively — never flatten a PNG to a solid bg.
  // Orientation was baked into the pixels by .rotate() above, so sharp's default
  // metadata-stripping (no .withMetadata() call) leaves a clean, EXIF-free file.
  const toWebp = (pipeline: Sharp) =>
    pipeline.webp({ quality, alphaQuality: hasAlpha ? 100 : undefined, effort: 4 });

  // Primary: downscale to MAX_WIDTH on the long edge, never upscale.
  const primaryWidth = Math.min(srcWidth, MAX_WIDTH);
  const primary = await toWebp(
    base.clone().resize({ width: primaryWidth, withoutEnlargement: true, fit: 'inside' }),
  ).toBuffer();

  // Responsive variants — skip any width that would upscale the source.
  const variants: ProcessedVariant[] = [];
  for (const width of RESPONSIVE_WIDTHS) {
    if (width >= srcWidth) continue;
    const buffer = await toWebp(
      base.clone().resize({ width, withoutEnlargement: true, fit: 'inside' }),
    ).toBuffer();
    variants.push({ width, buffer, suffix: `-${width}w` });
  }

  // Blur placeholder — ~10px wide WebP as a base64 data URL.
  const blur = await base
    .clone()
    .resize({ width: 10, withoutEnlargement: true })
    .webp({ quality: 40 })
    .toBuffer();
  const blurDataURL = `data:image/webp;base64,${blur.toString('base64')}`;

  return {
    primary,
    variants,
    blurDataURL,
    contentType: 'image/webp',
    extension: 'webp',
    width: primaryWidth,
    height: srcWidth ? Math.round((srcHeight * primaryWidth) / srcWidth) : srcHeight,
  };
}

function clampInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = raw ? parseInt(raw, 10) : NaN;
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
