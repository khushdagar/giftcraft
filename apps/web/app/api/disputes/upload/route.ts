import { NextRequest, NextResponse } from 'next/server';
import { uploadToDigitalOcean } from '@/lib/upload-to-digital-ocean';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * POST /api/disputes/upload
 * Uploads a dispute evidence photo to Digital Ocean Spaces and returns the CDN
 * URL. Public (the dispute filing page is token-based, no login), limited to
 * images up to 10MB.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    if (!ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      return NextResponse.json(
        { error: 'Only image files (JPG, PNG, WEBP, HEIC) are allowed' },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'Image must be under 10MB' }, { status: 400 });
    }

    const url = await uploadToDigitalOcean(file, 'disputes');
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Dispute photo upload failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
