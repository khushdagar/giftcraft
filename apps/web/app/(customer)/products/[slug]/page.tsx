import { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
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
import { RecentlyViewed, RecentlyViewedTracker } from "@/components/product/recently-viewed";
import { ViewTracker } from "@/components/analytics/view-tracker";
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
// Deliberately NO generateStaticParams: prerendering every product at build
// time opened ~150 concurrent Postgres connections and exhausted the pool,
// failing the build. On-demand rendering keeps the same ISR caching without
// the build-time storm.
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    select: {
      name: true,
      descriptionShort: true,
      status: true,
      metaTitle: true,
      metaDescription: true,
      // Primary image first, else the first by sort order.
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1, select: { url: true } },
    },
  });

  if (!product || product.status !== "active")
    return { title: "Product not found", robots: { index: false, follow: false } };

  // Admin-authored SEO fields (Products → SEO tab) win over the derived defaults.
  const metaTitle = product.metaTitle?.trim() || null;
  const description =
    product.metaDescription?.trim() ||
    product.descriptionShort ||
    `Order ${product.name} in bulk with your branding. Transparent per-unit pricing on GIVOO.`;
  const url = `/products/${params.slug}`;
  // Every product must have SOME preview image — fall back to the branded
  // site card so link previews never render blank.
  const ogImage = product.images?.[0]?.url || "/opengraph-image";

  return {
    // Root template appends "· GIVOO" — don't add the brand here. An
    // admin-authored page title is used verbatim (matches the admin SEO preview).
    title: metaTitle ? { absolute: metaTitle } : product.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: metaTitle || product.name,
      description,
      siteName: "GIVOO",
      locale: "en_IN",
      images: [{ url: ogImage, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle || product.name,
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
              name: true,
              status: true,
              images: { orderBy: { sortOrder: "asc" }, take: 2 },
              // Member variants power the per-product pickers on a pack page —
              // a pack has no variants of its own.
              variants: {
                orderBy: { sortOrder: "asc" },
                select: { kind: true, value: true, hexColor: true, imageUrl: true },
              },
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

  if (!product) {
    // The slug may be one this product used to have (renamed in admin) — 301 to
    // the current URL so old links, shared URLs and search results keep working.
    const renamed = await prisma.productSlugHistory.findUnique({
      where: { slug: params.slug },
      select: { product: { select: { slug: true, status: true } } },
    });
    if (renamed?.product && renamed.product.status === "active") {
      permanentRedirect(`/products/${renamed.product.slug}`);
    }
    notFound();
  }

  if (product.status !== "active") {
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

  const occasionIds = product.occasions?.map((po: any) => po.occasionId) ?? [];

  // Related: for a pack show sibling packs sharing an occasion with a derived
  // "from" price; for a normal product show same-category products (never packs).
  const related: any[] = isPack
    ? await prisma.product.findMany({
        where: {
          status: "active",
          isPack: true,
          id: { not: product.id },
          // Occasion is the rung packs are grouped by now. With none set, any
          // other pack is a fair suggestion.
          ...(occasionIds.length > 0
            ? { occasions: { some: { occasionId: { in: occasionIds } } } }
            : {}),
        },
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          packItems: {
            include: {
              product: {
                select: {
                  priceTiers: { where: { tier: 1 }, select: { sellPrice: true } },
                  // Member shots build the card's collage — a pack has no
                  // image of its own.
                  images: { where: { isPrimary: true }, take: 1, select: { url: true } },
                },
              },
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
  // One image per member product → the pack's collage gallery. Kept parallel
  // to `memberOutOfStock` below (both built from the same filtered list) so
  // the gallery can flag which cell belongs to an unavailable member.
  const membersWithImages = product.packItems.filter((it) => it.product.images[0]?.url);
  const memberImages = membersWithImages.map((it) => it.product.images[0]!.url);
  const memberOutOfStock = membersWithImages.map((it) => it.product.status !== "active");
  // Members + their variants, for the pack page's per-product option pickers.
  const packMembers = product.packItems.map((it) => ({
    id: it.productId,
    name: it.product.name,
    quantity: it.quantity,
    image: it.product.images[0]?.url ?? null,
    outOfStock: it.product.status !== "active",
    variants: it.product.variants.map((v) => ({
      kind: v.kind,
      value: v.value,
      hexColor: v.hexColor,
      imageUrl: v.imageUrl,
    })),
  }));
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
          collageImages: p.packItems
            .map((it: any) => it.product.images[0]?.url)
            .filter(Boolean)
            .slice(0, 4),
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
  // Up to 5 approved reviews, quoted verbatim into the markup. Real rows only.
  const schemaReviews = await prisma.review.findMany({
    where: { productId: product.id, status: "approved" },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      rating: true,
      title: true,
      comment: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  });

  // The SAME slabs the price table renders, so the markup and the visible
  // table can never disagree. Packs price off their members' derived tiers.
  const schemaTiers = (
    isPack
      ? derivedTiers.map((t) => ({
          minQty: t.minQty,
          maxQty: t.maxQty,
          sellPrice: Number(t.sellPrice),
        }))
      : (product.priceTiers ?? []).map((t) => ({
          minQty: t.minQty,
          maxQty: t.maxQty,
          sellPrice: Number(t.sellPrice),
        }))
  ).filter((t) => t.sellPrice > 0);
  const tier1Price = schemaTiers[0]?.sellPrice ?? 0;
  const schemaImages = (isPack ? memberImages : product.images.map((im) => im.url)).filter(Boolean);
  const productJsonLd = productSchema({
    name: product.name,
    slug: product.slug,
    description: product.descriptionShort,
    sku: product.sku,
    brand: product.brand,
    images: schemaImages,
    tiers: schemaTiers,
    price: tier1Price,
    moq,
    category: categoryName,
    inStock: true, // status === "active" is enforced above
    aggregateRating:
      reviewAgg._count > 0 && reviewAgg._avg.rating
        ? {
            ratingValue: Math.round(reviewAgg._avg.rating * 10) / 10,
            reviewCount: reviewAgg._count,
          }
        : undefined,
    reviews: schemaReviews.map((r) => ({
      author: r.user?.name || "Verified buyer",
      rating: r.rating,
      body: r.comment,
      title: r.title,
      datePublished: r.createdAt.toISOString(),
    })),
  });
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Catalog", path: "/catalog" },
    { name: categoryName, path: categoryHref },
    { name: product.name, path: `/products/${product.slug}` },
  ]);

  return (
    <div className="pdp-gutters bg-canvas pb-24 lg:pb-0">
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
        {/* Gallery - Sticky on desktop. `position: sticky` opens its own
            stacking context, so the hover-zoom panel's z-50 is trapped inside
            this column; the z-20 here lifts the whole column above the info
            column, which otherwise paints over the panel (it comes later in
            the DOM). */}
        <div className="relative z-20 lg:sticky lg:top-6 lg:h-fit">
          {isPack ? (
            <PackImageGallery
              images={memberImages}
              outOfStock={memberOutOfStock}
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
          packMembers={packMembers}
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

      {/* Popularity counter — this page serves packs too (packs are Products) */}
      <ViewTracker type="product" id={product.id} />

      {/* Recently viewed — records this visit, then shows the earlier ones */}
      <RecentlyViewedTracker
        id={product.id}
        name={product.name}
        slug={product.slug}
        image={schemaImages[0]}
        collageImages={isPack ? memberImages.slice(0, 4) : undefined}
        fromPrice={schemaTiers.length > 0 ? Math.min(...schemaTiers.map((t) => t.sellPrice)) : 0}
      />
      <RecentlyViewed excludeId={product.id} />
    </div>
  );
}
