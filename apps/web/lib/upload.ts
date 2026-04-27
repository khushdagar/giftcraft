/**
 * Upload file to Digital Ocean Spaces
 * Returns CDN URL for the uploaded file
 */
export async function uploadToDigitalOcean(
  file: File,
  folder: string = 'products'
): Promise<string> {
  const buffer = await file.arrayBuffer();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;

  const accessKey = process.env.DO_SPACES_KEY;
  const secretKey = process.env.DO_SPACES_SECRET;
  const region = process.env.DO_SPACES_REGION || 'sfo3';
  const bucket = process.env.DO_SPACES_BUCKET || 'giftcraft-dev';
  const endpoint = `https://${region}.digitaloceanspaces.com`;

  if (!accessKey || !secretKey) {
    throw new Error('Digital Ocean Spaces credentials not configured');
  }

  // Create S3-compatible request
  const url = new URL(`${endpoint}/${bucket}/${fileName}`);

  const response = await fetch(url.toString(), {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'image/jpeg',
    },
    body: buffer,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  // Return the CDN URL
  const cdnEndpoint =
    process.env.DO_SPACES_CDN_ENDPOINT ||
    `https://${bucket}.${region}.cdn.digitaloceanspaces.com`;
  return `${cdnEndpoint}/${fileName}`;
}
