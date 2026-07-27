import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/serialize";
import { formatRupees } from "@/lib/utils";
import { toRichHtml } from "@/lib/rich-text";
import { ImageGallery } from "@/components/product/image-gallery";
import { PackImageGallery } from "@/components/product/pack-image-gallery";
import { PricingBlock } from "@/components/product/pricing-block";
import { PackagingSelector } from "@/components/product/packaging-selector";
import { AddonsSelector } from "@/components/product/addons-selector";
import { RelatedProducts } from "@/components/product/related-products";
import { ExpertHelp } from "@/components/product/expert-help";
import { ProductTabs } from "@/components/product/product-tabs";
import { ColorSelector } from "@/components/product/color-selector";
import { ProductInfoSection } from "@/components/product/product-info-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    select: { name: true, descriptionShort: true, images: { where: { isPrimary: true }, take: 1 } },
  });

  if (!product) return { title: "Product not found" };

  return {
    title: `${product.name} | GIVOO`,
    description: product.descriptionShort || "Corporate gifting made simple.",
    openGraph: {
      title: product.name,
      description: product.descriptionShort || undefined,
      images: product.images?.[0]?.url ? [{ url: product.images[0].url }] : [],
    },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: {
      priceTiers: { orderBy: { tier: "asc" } },
      images: { orderBy: { sortOrder: "asc" } },
      hsn: { include: { hsn: true } },
      categories: { include: { category: true } },
      occasions: { include: { occasion: true } },
      variants: { orderBy: { sortOrder: "asc" } },
      // Member products (only present when this product is a curated pack).
      packItems: {
        orderBy: { sortOrder: "asc" },
        include: {
          product: {
            select: {
              id: true,
              images: { orderBy: { sortOrder: "asc" }, take: 2 },
              priceTiers: {
                orderBy: { tier: "asc" },
                select: { minQty: true, maxQty: true, sellPrice: true },
              },
            },
          },
        },
      },
    },
  });

  if (!product || product.status !== "active") {
    notFound();
  }

  // ── Curated pack: derive price tiers from member products ──────────────────
  const isPack = product.isPack;
  const memberProductIds = product.packItems.map((it) => it.productId);
  let derivedTiers: Array<{
    id: string;
    productId: string;
    tier: number;
    minQty: number;
    maxQty: number | null;
    costPrice: number;
    sellPrice: number;
  }> = [];
  if (isPack) {
    const members = product.packItems.map((it) => ({
      qty: it.quantity,
      tiers: it.product.priceTiers.map((t) => ({
        minQty: t.minQty,
        maxQty: t.maxQty,
        sellPrice: Number(t.sellPrice),
      })),
    }));
    const priceAtQty = (
      tiers: { minQty: number; maxQty: number | null; sellPrice: number }[],
      q: number
    ) => {
      if (!tiers.length) return 0;
      const t =
        tiers.find((t) => q >= t.minQty && (t.maxQty == null || q <= t.maxQty)) ?? tiers[0];
      return t ? t.sellPrice : 0;
    };
    const bps = Array.from(
      new Set(members.flatMap((m) => m.tiers.map((t) => t.minQty)))
    ).sort((a, b) => a - b);
    derivedTiers = bps.map((bp, i) => ({
      id: `d${i}`,
      productId: product.id,
      tier: i + 1,
      minQty: bp,
      maxQty: bps[i + 1] != null ? bps[i + 1]! - 1 : null,
      costPrice: 0,
      sellPrice: members.reduce((s, m) => s + priceAtQty(m.tiers, bp) * m.qty, 0),
    }));
  }

  const categoryName = product.categories?.[0]?.category?.name || "Products";
  const categoryId = product.categories?.[0]?.categoryId;

  // Related: for a pack show sibling packs (same collection) with a derived
  // "from" price; for a normal product show same-category products (never packs).
  const related: any[] = isPack
    ? await prisma.product.findMany({
        where: {
          status: "active",
          isPack: true,
          id: { not: product.id },
          ...(product.packCollectionId ? { packCollectionId: product.packCollectionId } : {}),
        },
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          packItems: {
            include: {
              product: { select: { priceTiers: { where: { tier: 1 }, select: { sellPrice: true } } } },
            },
          },
        },
        take: 8,
      })
    : categoryId
    ? await prisma.product.findMany({
        where: {
          status: "active",
          isPack: false,
          id: { not: product.id },
          categories: { some: { categoryId } },
        },
        include: { priceTiers: { where: { tier: 1 }, take: 1 }, images: { where: { isPrimary: true }, take: 1 } },
        take: 4,
      })
    : [];

  const serialized = serializeProduct(product);
  // For packs, present the derived tiers instead of the (empty) own tiers.
  const displaySerialized = isPack ? { ...serialized, priceTiers: derivedTiers } : serialized;
  // One image per member product → the pack's collage gallery.
  const memberImages = product.packItems
    .map((it) => it.product.images[0]?.url)
    .filter((u): u is string => Boolean(u));
  // Related cards: packs get a computed "from" price; products serialize normally.
  const serializedRelated = isPack
    ? related.map((p) => {
        const fromPrice = p.packItems.reduce((s: number, it: any) => {
          const t1 = it.product.priceTiers[0];
          return s + (t1 ? Number(t1.sellPrice) : 0) * it.quantity;
        }, 0);
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          brand: p.brand,
          images: p.images,
          priceTiers: [{ sellPrice: fromPrice }],
        };
      })
    : related.map(serializeProduct);
  const gstRate = product.hsn?.hsn ? Number(product.hsn.hsn.defaultGstRate) : 18;
  // Use the product's own MOQ; fall back to the first tier's minQty.
  const moq =
    (product as any).moq ||
    (isPack ? derivedTiers[0]?.minQty : product.priceTiers?.[0]?.minQty) ||
    25;

  return (
    <div className="bg-canvas pb-24 lg:pb-0">
      {/* Breadcrumb */}
      <div className="container-gc-w pt-6">
        <p className="text-xs text-ink-3">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          {" / "}
          <Link href="/catalog" className="hover:text-ink">
            Catalog
          </Link>
          {" / "}
          <Link href={`/catalog?categoryId=${categoryId}`} className="hover:text-ink">
            {categoryName}
          </Link>
          {" / "}
          <span className="text-ink">{product.name}</span>
        </p>
      </div>

      <div className="container-gc-w grid grid-cols-1 gap-12 py-8 lg:grid-cols-[1.2fr_1fr] lg:py-12">
        {/* Gallery - Sticky on desktop */}
        <div className="lg:sticky lg:top-6 lg:h-fit">
          {isPack ? (
            <PackImageGallery
              images={memberImages}
              productName={product.name}
              productId={product.id}
              slug={product.slug}
            />
          ) : (
            <ImageGallery
              images={product.images && product.images.length > 0 ? product.images : serialized.images || []}
              productName={product.name}
              productId={product.id}
              slug={product.slug}
            />
          )}
        </div>

        {/* Info — pass the serialized product (raw Prisma Decimals can't cross
            the Server→Client boundary and crash React's RSC deserializer). */}
        <ProductInfoSection
          product={displaySerialized}
          serialized={displaySerialized}
          gstRate={gstRate}
          moq={moq}
          categoryName={categoryName}
          variants={displaySerialized.variants}
          isPack={isPack}
          packProductIds={memberProductIds}
        />
      </div>

      {/* Product tabs and details */}
      <div className="container-gc-w">
        <ProductTabs
          description={toRichHtml(product.descriptionLong)}
          specifications={toRichHtml(product.specifications)}
          designArtwork={toRichHtml(product.designArtwork)}
          shippingDelivery={toRichHtml(product.shippingDelivery)}
          samples={toRichHtml(product.samplesInfo)}
          packagingAddons={toRichHtml(product.packagingAddons)}
        />
      </div>

      {/* Related Products */}
      {serializedRelated.length > 0 && <RelatedProducts products={serializedRelated} />}
    </div>
  );
}
