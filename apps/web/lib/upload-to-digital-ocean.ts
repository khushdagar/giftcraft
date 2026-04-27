import crypto from 'crypto';

export async function uploadToDigitalOcean(file: File, folder: string = 'products'): Promise<string> {
  const buffer = await file.arrayBuffer();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;

  const accessKey = process.env.DO_SPACES_KEY;
  const secretKey = process.env.DO_SPACES_SECRET;
  const region = process.env.DO_SPACES_REGION || 'sfo3';
  const bucket = process.env.DO_SPACES_BUCKET || 'giftcraft-dev';
  const endpoint = `${region}.digitaloceanspaces.com`;

  if (!accessKey || !secretKey) {
    throw new Error('Digital Ocean Spaces credentials not configured');
  }

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);
  const contentType = file.type || 'image/jpeg';

  // Create canonical request
  const canonicalUri = `/${bucket}/${fileName}`;
  const canonicalQueryString = '';
  const canonicalHeaders = `content-type:${contentType}\nhost:${endpoint}\nx-amz-content-sha256:UNSIGNED-PAYLOAD\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const payloadHash = 'UNSIGNED-PAYLOAD';

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  // Create string to sign
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const canonicalRequestHash = crypto
    .createHash('sha256')
    .update(canonicalRequest)
    .digest('hex');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');

  // Calculate signature
  const kDate = crypto
    .createHmac('sha256', `AWS4${secretKey}`)
    .update(dateStamp)
    .digest();
  const kRegion = crypto
    .createHmac('sha256', kDate)
    .update(region)
    .digest();
  const kService = crypto
    .createHmac('sha256', kRegion)
    .update('s3')
    .digest();
  const kSigning = crypto
    .createHmac('sha256', kService)
    .update('aws4_request')
    .digest();

  const signature = crypto
    .createHmac('sha256', kSigning)
    .update(stringToSign)
    .digest('hex');

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const url = `https://${endpoint}/${bucket}/${fileName}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      Authorization: authHeader,
    },
    body: buffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`DO Upload error ${response.status}:`, errorText);
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const cdnEndpoint = process.env.DO_SPACES_CDN_ENDPOINT || `https://${bucket}.${region}.cdn.digitaloceanspaces.com`;
  return `${cdnEndpoint}/${fileName}`;
}
