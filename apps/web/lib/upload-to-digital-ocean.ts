import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { processImage, sniffImageFormat, ImageValidationError } from './image-processing';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const region = process.env.DO_SPACES_REGION || 'sfo3';
    const accessKey = process.env.DO_SPACES_KEY;
    const secretKey = process.env.DO_SPACES_SECRET;

    console.log('[DO Upload] Initializing S3Client');
    console.log('[DO Upload] Region:', region);
    console.log('[DO Upload] Access Key loaded:', !!accessKey);
    console.log('[DO Upload] Secret Key loaded:', !!secretKey);

    if (!accessKey || !secretKey) {
      throw new Error('Digital Ocean Spaces credentials not configured');
    }

    console.log('[DO Upload] Creating S3Client with credentials');
    s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      endpoint: `https://${region}.digitaloceanspaces.com`,
      forcePathStyle: false,
    });
  }
  return s3Client;
}

function getBucketAndCdn() {
  const region = process.env.DO_SPACES_REGION || 'sfo3';
  const bucket = process.env.DO_SPACES_BUCKET || 'giftcraft-dev';
  const cdnEndpoint =
    process.env.DO_SPACES_CDN_ENDPOINT ||
    `https://${bucket}.${region}.cdn.digitaloceanspaces.com`;
  return { bucket, cdnEndpoint };
}

/** Low-level PUT of a single object. Returns its public CDN URL. */
async function putObject(key: string, body: Buffer, contentType: string): Promise<string> {
  const { bucket, cdnEndpoint } = getBucketAndCdn();
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: 'public-read',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  return `${cdnEndpoint}/${key}`;
}

/** Build a web-safe object key, minus extension, from a folder + original name. */
function buildKeyBase(fileName: string, folder: string): string {
  const dot = fileName.lastIndexOf('.');
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
  const safeName = stem
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9.\-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}-${safeName || 'file'}`;
}

export interface UploadedImage {
  /** CDN URL of the full-size WebP. Use this wherever a single URL is expected. */
  url: string;
  /** CDN URLs of responsive variants, ascending by width. */
  variants: { width: number; url: string }[];
  /** base64 data URL for next/image placeholder="blur". */
  blurDataURL: string;
  width: number;
  height: number;
}

/**
 * Upload an image with full server-side processing: converts to WebP, generates
 * responsive variants + a blur placeholder, strips EXIF, and bakes orientation.
 *
 * Non-raster files (SVG, PDF, AI, EPS) are detected and stored untouched.
 * If sharp processing throws for any reason other than a validation error, the
 * ORIGINAL bytes are stored so the upload is never lost (the error is logged).
 *
 * @param hasText Pass true for logos/graphics to use higher WebP quality.
 */
export async function uploadImageWithVariants(
  file: File,
  folder: string = 'products',
  { hasText = false }: { hasText?: boolean } = {},
): Promise<UploadedImage> {
  const original = Buffer.from(await file.arrayBuffer());
  const keyBase = buildKeyBase(file.name, folder);

  // Pass non-raster assets (vector/PDF) straight through untouched.
  if (!sniffImageFormat(original)) {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const url = await putObject(`${keyBase}.${ext}`, original, file.type || 'application/octet-stream');
    return { url, variants: [], blurDataURL: '', width: 0, height: 0 };
  }

  let processed;
  try {
    processed = await processImage(original, { hasText });
  } catch (err) {
    // Validation errors (bad magic bytes, oversize, unreadable) must surface.
    if (err instanceof ImageValidationError) throw err;
    // Any other sharp failure: don't lose the upload — store the original.
    console.error('[DO Upload] sharp processing failed, storing original:', err);
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const url = await putObject(`${keyBase}.${ext}`, original, file.type || 'image/jpeg');
    return { url, variants: [], blurDataURL: '', width: 0, height: 0 };
  }

  const url = await putObject(`${keyBase}.${processed.extension}`, processed.primary, processed.contentType);

  const variants = await Promise.all(
    processed.variants.map(async (v) => ({
      width: v.width,
      url: await putObject(`${keyBase}${v.suffix}.${processed.extension}`, v.buffer, processed.contentType),
    })),
  );

  console.log(`✓ Image processed & uploaded: ${url} (+${variants.length} variants)`);
  return {
    url,
    variants,
    blurDataURL: processed.blurDataURL,
    width: processed.width,
    height: processed.height,
  };
}

/**
 * Back-compatible uploader. Runs the full image pipeline and returns the single
 * primary WebP URL — same `Promise<string>` contract every existing caller and
 * API response already relies on.
 */
export async function uploadToDigitalOcean(file: File, folder: string = 'products'): Promise<string> {
  const { url } = await uploadImageWithVariants(file, folder);
  return url;
}
