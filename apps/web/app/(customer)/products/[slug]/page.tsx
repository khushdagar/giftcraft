import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/serialize";
import { formatRupees } from "@/lib/utils";
import { ImageGallery } from "@/components/product/image-gallery";
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
    title: `${product.name} | GiftCraft`,
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
    },
  });

  if (!product || product.status !== "active") {
    notFound();
  }

  const categoryName = product.categories?.[0]?.category?.name || "Products";
  const categoryId = product.categories?.[0]?.categoryId;

  const related = categoryId
    ? await prisma.product.findMany({
        where: {
          status: "active",
          id: { not: product.id },
          categories: { some: { categoryId } },
        },
        include: { priceTiers: { where: { tier: 1 }, take: 1 }, images: { where: { isPrimary: true }, take: 1 } },
        take: 4,
      })
    : [];

  const serialized = serializeProduct(product);
  const serializedRelated = related.map(serializeProduct);
  const gstRate = product.hsn?.hsn ? Number(product.hsn.hsn.defaultGstRate) : 18;
  // Use the product's own MOQ; fall back to the first tier's minQty.
  const moq = (product as any).moq || product.priceTiers?.[0]?.minQty || 25;

  return (
    <div className="bg-canvas">
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
          <ImageGallery
            images={product.images && product.images.length > 0 ? product.images : serialized.images || []}
            productName={product.name}
          />
        </div>

        {/* Info — pass the serialized product (raw Prisma Decimals can't cross
            the Server→Client boundary and crash React's RSC deserializer). */}
        <ProductInfoSection
          product={serialized}
          serialized={serialized}
          gstRate={gstRate}
          moq={moq}
          categoryName={categoryName}
          variants={serialized.variants}
        />
      </div>

      {/* Product tabs and details */}
      <div className="container-gc-w">
        <ProductTabs
          description={product.descriptionLong || undefined}
        />
      </div>

      {/* Related Products */}
      {serializedRelated.length > 0 && <RelatedProducts products={serializedRelated} />}
    </div>
  );
}
