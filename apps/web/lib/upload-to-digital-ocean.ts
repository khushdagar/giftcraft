import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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

export async function uploadToDigitalOcean(file: File, folder: string = 'products'): Promise<string> {
  const buffer = await file.arrayBuffer();
  // Sanitize the original name so the object key / URL is web-safe (no spaces or
  // special characters that would produce fragile URLs).
  const safeName = file.name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9.\-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}-${safeName}`;

  const region = process.env.DO_SPACES_REGION || 'sfo3';
  const bucket = process.env.DO_SPACES_BUCKET || 'giftcraft-dev';

  try {
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      Body: Buffer.from(buffer),
      ContentType: file.type || 'image/jpeg',
      ACL: 'public-read',
    });

    await client.send(command);

    const cdnEndpoint = process.env.DO_SPACES_CDN_ENDPOINT || `https://${bucket}.${region}.cdn.digitaloceanspaces.com`;
    const url = `${cdnEndpoint}/${fileName}`;

    console.log(`✓ Image uploaded: ${fileName}`);
    return url;
  } catch (error) {
    console.error('Digital Ocean upload error:', error);

    // Extract detailed error info
    let errorMsg = 'Unknown error';
    if (error instanceof Error) {
      errorMsg = error.message;
      console.error('Error name:', error.name);
      console.error('Error stack:', error.stack);
    }

    // Log full error object for AWS SDK errors
    if (typeof error === 'object' && error !== null) {
      console.error('Full error object:', JSON.stringify(error, null, 2));
    }

    throw new Error(`Upload failed: ${errorMsg}`);
  }
}
