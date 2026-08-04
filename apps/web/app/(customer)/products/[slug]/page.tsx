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
import { ProductReviews } from "@/components/product/product-reviews";
import { ColorSelector } from "@/components/product/color-selector";
import { ProductInfoSection } from "@/components/product/product-info-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { productSchema, breadcrumbSchema } from "@/lib/schema";

// ISR: rendered on demand, then served from cache for an hour.
//
// Deliberately NO generateStaticParams: the root layout calls `await auth()`,
// so every route is dynamic and build-time prerendering emits no static HTML —
// it only opened ~150 concurrent Postgres connections during the build, which
// exhausted the pool and failed it. On-demand rendering keeps the same ISR
// caching without the build-time storm.
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    select: {
      name: true,
      descriptionShort: true,
      status: true,
      // Primary image first, else the first by sort order.
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1, select: { url: true } },
    },
  });

  if (!product || product.status !== "active")
    return { title: "Product not found", robots: { index: false, follow: false } };

  const description =
    product.descriptionShort ||
    `Order ${product.name} in bulk with your branding. Transparent per-unit pricing on GIVOO.`;
  const url = `/products/${params.slug}`;
  // Every product must have SOME preview image — fall back to the branded
  // site card so link previews never render blank.
  const ogImage = product.images?.[0]?.url || "/opengraph-image";

  return {
    // Root template appends "· GIVOO" — don't add the brand here.
    title: product.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: product.name,
      description,
      siteName: "GIVOO",
      locale: "en_IN",
      images: [{ url: ogImage, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: [ogImage],
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
  // Breadcrumbs point at the indexable category landing page (not a filtered
  // ?categoryId= URL), so the trail Google sees matches a real page.
  const categorySlug = product.categories?.[0]?.category?.slug;
  const categoryHref = categorySlug ? `/category/${categorySlug}` : "/catalog";

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

  // ── Structured data (server-rendered) ──────────────────────────────────────
  // Real approved-review aggregate only — never fabricated (Google penalizes).
  const reviewAgg = await prisma.review.aggregate({
    where: { productId: product.id, status: "approved" },
    _avg: { rating: true },
    _count: true,
  });
  const tier1Price = isPack
    ? derivedTiers[0]?.sellPrice ?? 0
    : Number(product.priceTiers?.[0]?.sellPrice ?? 0);
  const schemaImages = (isPack ? memberImages : product.images.map((im) => im.url)).filter(Boolean);
  const productJsonLd = productSchema({
    name: product.name,
    slug: product.slug,
    description: product.descriptionShort,
    sku: product.sku,
    brand: product.brand,
    images: schemaImages,
    price: tier1Price,
    inStock: true, // status === "active" is enforced above
    aggregateRating:
      reviewAgg._count > 0 && reviewAgg._avg.rating
        ? {
            ratingValue: Math.round(reviewAgg._avg.rating * 10) / 10,
            reviewCount: reviewAgg._count,
          }
        : undefined,
  });
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Catalog", path: "/catalog" },
    { name: categoryName, path: categoryHref },
    { name: product.name, path: `/products/${product.slug}` },
  ]);

  return (
    <div className="bg-canvas pb-24 lg:pb-0">
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
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
          <Link href={categoryHref} className="hover:text-ink">
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
          keyFeatures={toRichHtml(product.keyFeatures)}
          specifications={toRichHtml(product.specifications)}
          shippingDelivery={toRichHtml(product.shippingDelivery)}
        />
      </div>

      {/* Ratings & Reviews — client-fetched so it stays fresh despite the
          page-level revalidate cache */}
      <ProductReviews slug={product.slug} />

      {/* Related Products */}
      {serializedRelated.length > 0 && (
        <RelatedProducts products={serializedRelated} canAddToPack={!isPack} />
      )}
    </div>
  );
}
