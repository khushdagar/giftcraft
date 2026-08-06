import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { uploadToDigitalOcean } from '@/lib/upload-to-digital-ocean';

// Logo formats accepted per SOW §3.3.9: PNG, SVG, AI, EPS, PDF, JPG. Max 10MB.
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.svg', '.ai', '.eps', '.pdf'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * GET /api/brand-assets
 * Returns the logged-in user's company brand asset library ("Your Saved Logos").
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // The library is everything this user uploaded, plus everything their
    // company holds. A buyer who uploaded before their company existed still
    // sees their own logos; once they join a company they also see the ones a
    // colleague — or their own other sign-in email — uploaded.
    const companyId = session.user.companyId;
    const assets = await prisma.brandAsset.findMany({
      where: companyId
        ? { OR: [{ companyId }, { uploadedBy: session.user.id }] }
        : { uploadedBy: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, url: true, mimeType: true, createdAt: true },
    });

    return NextResponse.json({ success: true, assets });
  } catch (error) {
    console.error('Error listing brand assets:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load brand assets' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/brand-assets
 * Uploads a logo to Digital Ocean Spaces and saves it to the customer's brand
 * asset library so it can be reused on future orders (SOW §3.3.9 / §3.4.3).
 */
export async function POST(request: NextRequest) {
  try {
    // Login is NOT required to upload a logo — guests can brand their pack in the
    // builder and provide their details later at checkout. When the user IS
    // signed in and belongs to a company, we also persist it to their saved
    // brand-asset library below so it can be reused on future orders.
    const session = await auth();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
    if (!hasValidExtension) {
      return NextResponse.json(
        { error: 'Only JPG, PNG, SVG, AI, EPS, and PDF files are allowed' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Upload to Digital Ocean Spaces (folder: logos)
    const url = await uploadToDigitalOcean(file, 'logos');

    // Persist to the brand asset library for any signed-in user. Most buyers
    // upload their logo in the builder BEFORE they have a company — that only
    // gets created from the billing block at checkout — so gating the save on
    // companyId silently dropped every first-time upload. We record it against
    // the uploader instead, and the order flow adopts it into the company
    // library once one exists. Guests (no session) still get the CDN URL.
    let assetId: string | null = null;
    const userId = session?.user?.id;
    if (userId) {
      const asset = await prisma.brandAsset.create({
        data: {
          companyId: session?.user?.companyId ?? null,
          name: file.name,
          url,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          uploadedBy: userId,
        },
      });
      assetId = asset.id;
    }

    return NextResponse.json({
      success: true,
      id: assetId,
      url,
      name: file.name,
    });
  } catch (error) {
    console.error('Error uploading brand asset:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload logo' },
      { status: 500 }
    );
  }
}
