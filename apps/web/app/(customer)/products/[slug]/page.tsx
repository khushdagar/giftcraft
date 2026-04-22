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
import { DeliveryEstimator } from "@/components/product/delivery-estimator";
import { LogoUpload } from "@/components/product/logo-upload";
import { RelatedProducts } from "@/components/product/related-products";
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
        {/* Gallery */}
        <ImageGallery images={serialized.images || []} productName={product.name} />

        {/* Info */}
        <div>
          <p className="overline mb-2 text-ink-3">{product.brand ? `${product.brand} · ` : ""}{categoryName}</p>
          <h1 className="t-heading">{product.name}</h1>
          <p className="mt-3 text-base leading-relaxed text-ink-2">
            {product.descriptionShort || product.descriptionLong}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {product.isEcoCertified && <Badge variant="em">ECO CERTIFIED</Badge>}
            {product.isFeatured && <Badge variant="gold">BESTSELLER</Badge>}
          </div>

          {/* Pricing */}
          <PricingBlock priceTiers={serialized.priceTiers || []} gstRate={gstRate} hsnCode={product.hsn?.hsn?.code} />

          <p className="mt-2 text-xs text-ink-3">
            GST {gstRate}% {product.hsn?.hsn?.code ? `· HSN ${product.hsn.hsn.code}` : ""}
          </p>

          {/* CTA */}
          <div className="mt-6 flex gap-3">
            <Button asChild variant="em" size="xl" className="flex-1">
              <Link href={`/builder?product=${product.id}`}>Add to Gift Builder</Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link href="/catalog">Continue Shopping</Link>
            </Button>
          </div>

          {/* Packaging & Addons */}
          <div className="mt-8 space-y-6">
            <PackagingSelector productId={product.id} />
            <AddonsSelector productId={product.id} />
          </div>

          {/* Delivery */}
          <div className="mt-8">
            <DeliveryEstimator />
          </div>

          {/* Logo Upload */}
          <div className="mt-8">
            <LogoUpload />
          </div>
        </div>
      </div>

      {/* Related Products */}
      {serializedRelated.length > 0 && <RelatedProducts products={serializedRelated} />}
    </div>
  );
}
