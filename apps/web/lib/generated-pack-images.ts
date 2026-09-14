import { prisma } from '@/lib/prisma';
import { PACK_IMAGE_MODEL } from '@/lib/gemini-pack-image';

export interface PackImageRecordInput {
  url: string | null | undefined;
  packLabel: string | null;
  boxName: string | null;
  productNames: string[];
  logoUrl?: string | null;
}

/**
 * Make sure every AI pack image used in a preview or a sent proposal is listed
 * in the Generated Images tab. Images are normally recorded when generated, but
 * the builder reuses an unchanged image across sessions — one generated before
 * recording existed (or whose insert failed) would otherwise never appear.
 * Already-recorded URLs are skipped. Best-effort: never throws.
 */
export async function recordPackImages(
  createdById: string | null,
  companyName: string | null | undefined,
  items: PackImageRecordInput[]
): Promise<void> {
  try {
    for (const item of items) {
      if (!item.url) continue;
      const existing = await prisma.generatedPackImage.findFirst({
        where: { url: item.url },
        select: { id: true },
      });
      if (existing) continue;
      await prisma.generatedPackImage.create({
        data: {
          url: item.url,
          packLabel: item.packLabel,
          companyName: companyName?.trim() || null,
          boxName: item.boxName,
          productNames: item.productNames,
          logoUrl: item.logoUrl || null,
          model: PACK_IMAGE_MODEL,
          createdById,
        },
      });
    }
  } catch (err) {
    console.error('Failed to record pack images:', err);
  }
}
