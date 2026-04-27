import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const region = process.env.DO_SPACES_REGION || 'sfo3';
    const accessKey = process.env.DO_SPACES_KEY;
    const secretKey = process.env.DO_SPACES_SECRET;

    if (!accessKey || !secretKey) {
      throw new Error('Digital Ocean Spaces credentials not configured');
    }

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
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;

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
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Digital Ocean upload error:', errorMsg, { error });
    throw new Error(`Upload failed: ${errorMsg}`);
  }
}
