import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { uploadToDigitalOcean } from '@/lib/upload-to-digital-ocean';

/**
 * POST /api/admin/products/[id]/images
 * Upload images immediately to database
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await request.formData();
    const imageFiles = formData.getAll('images').filter((f): f is File => f instanceof File);

    // Already-hosted image URLs — sent either by the client after a
    // compress-and-upload (so we get an upload progress bar) or when the user
    // picks from the existing media library. Accepts a JSON array string.
    let imageUrlItems: { url: string; altText?: string }[] = [];
    const urlsRaw = formData.get('urls');
    if (typeof urlsRaw === 'string' && urlsRaw.trim()) {
      try {
        const parsed = JSON.parse(urlsRaw);
        if (Array.isArray(parsed)) {
          imageUrlItems = parsed
            .map((u) =>
              typeof u === 'string'
                ? { url: u }
                : u && typeof u.url === 'string'
                  ? { url: u.url, altText: typeof u.altText === 'string' ? u.altText : undefined }
                  : null
            )
            .filter((u): u is { url: string; altText?: string } => !!u && !!u.url);
        }
      } catch {
        return NextResponse.json({ error: 'Invalid urls payload' }, { status: 400 });
      }
    }

    if (imageFiles.length === 0 && imageUrlItems.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { images: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Upload images and save to database
    const uploadedImages: any[] = [];
    const failedImages: string[] = [];

    // Helper: next sort position / whether this is the product's first image.
    const nextSort = () => product.images.length + uploadedImages.length;
    const isFirstEver = () => product.images.length === 0 && uploadedImages.length === 0;

    // 1) Files uploaded straight to this endpoint (legacy path).
    for (const file of imageFiles) {
      try {
        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
          failedImages.push(`${file.name} (exceeds 5MB)`);
          continue;
        }

        // Upload to Digital Ocean
        const url = await uploadToDigitalOcean(file);

        // Save to database immediately. Only the very first image of a product
        // with no existing images becomes primary — NOT every image in the batch.
        const savedImage = await prisma.productImage.create({
          data: {
            productId: params.id,
            url,
            isPrimary: isFirstEver(),
            sortOrder: nextSort(),
            altText: file.name.replace(/\.[^/.]+$/, ''), // Remove extension for alt text
          },
        });

        uploadedImages.push(savedImage);
        console.log(`✓ Image saved: ${file.name}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        failedImages.push(`${file.name}: ${errorMsg}`);
        console.error(`✗ Failed to save ${file.name}:`, err);
      }
    }

    // 2) Already-hosted URLs (client-uploaded with progress, or picked from
    //    the media library) — just record them, no re-upload.
    for (const item of imageUrlItems) {
      try {
        const savedImage = await prisma.productImage.create({
          data: {
            productId: params.id,
            url: item.url,
            isPrimary: isFirstEver(),
            sortOrder: nextSort(),
            altText: item.altText ?? null,
          },
        });
        uploadedImages.push(savedImage);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        failedImages.push(`${item.url}: ${errorMsg}`);
        console.error(`✗ Failed to save ${item.url}:`, err);
      }
    }

    // Get updated product with all images
    const updatedProduct = await prisma.product.findUnique({
      where: { id: params.id },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });

    return NextResponse.json({
      success: true,
      uploadedCount: uploadedImages.length,
      failedCount: failedImages.length,
      failedImages: failedImages,
      images: updatedProduct?.images || [],
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload images' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/products/[id]/images?imageId=xxx
 * Set the given image as the product's primary image (unsets all others).
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const url = new URL(request.url);
    const imageId = url.searchParams.get('imageId');

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID required' }, { status: 400 });
    }

    // Verify image belongs to this product
    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId: params.id },
    });

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Exactly one primary: clear all, then set this one.
    await prisma.$transaction([
      prisma.productImage.updateMany({
        where: { productId: params.id },
        data: { isPrimary: false },
      }),
      prisma.productImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting primary image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set primary image' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/products/[id]/images?imageId=xxx
 * Update an image's alt text.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const url = new URL(request.url);
    const imageId = url.searchParams.get('imageId');

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const altText = typeof body.altText === 'string' ? body.altText : '';

    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId: params.id },
    });

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const updated = await prisma.productImage.update({
      where: { id: imageId },
      data: { altText },
    });

    return NextResponse.json({ success: true, image: updated });
  } catch (error) {
    console.error('Error updating image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update image' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/products/[id]/images/[imageId]
 * Delete a specific image
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const url = new URL(request.url);
    const imageId = url.searchParams.get('imageId');

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID required' }, { status: 400 });
    }

    // Verify image belongs to this product
    const image = await prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId: params.id,
      },
    });

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Delete from database
    await prisma.productImage.delete({
      where: { id: imageId },
    });

    // If this was the primary image, set the first remaining image as primary
    const remainingImages = await prisma.productImage.findMany({
      where: { productId: params.id },
      orderBy: { sortOrder: 'asc' },
      take: 1,
    });

    const firstRemaining = remainingImages[0];
    if (firstRemaining && !firstRemaining.isPrimary) {
      await prisma.productImage.update({
        where: { id: firstRemaining.id },
        data: { isPrimary: true },
      });
    }

    console.log(`✓ Image deleted: ${imageId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete image' },
      { status: 500 }
    );
  }
}
