import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isHiddenCategory, getHiddenCategoryIds } from "@/lib/catalog-visibility";
import Image from "next/image";

type FooterLink = [href: string, label: string];

// Static column — all company, help & legal links together. Every href points
// at a page that actually exists.
const COL_COMPANY: FooterLink[] = [
  ["/blog", "Blog"],
  ["/sell-with-us", "Sell With Us"],
  ["/contact", "Contact"],
  ["/faq", "FAQ"],
  ["/gst", "GST Info"],
];

// Legal links — rendered horizontally in the bottom bar, not in a column.
const LEGAL_LINKS: FooterLink[] = [
  ["/privacy", "Privacy Policy"],
  ["/shipping", "Shipping Policy"],
  ["/returns", "Refund Policy"],
  ["/terms", "Terms & Conditions"],
];

// Live catalog data for the Products / Curated Packs / Collections columns.
// Wrapped so a DB hiccup degrades to fewer links instead of breaking every page.
async function getFooterData() {
  try {
    const [rawCategories, collections, occasionRows, hiddenCategoryIds] = await Promise.all([
      // Only categories with at least one live catalog product — the category
      // landing page for an empty category is noindex, so never link to it.
      prisma.category.findMany({
        where: { products: { some: { product: { status: "active", isPack: false } } } },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.giftCollection.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        include: {
          packProducts: {
            where: { isPack: true, status: "active" },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      prisma.occasionConfig.findMany({
        where: { isActive: true, isCollection: false },
        orderBy: { sortOrder: "asc" },
      }),
      getHiddenCategoryIds(),
    ]);

    const categories = rawCategories.filter((c) => !isHiddenCategory(c));
    const liveCollections = collections.filter((c) => c.packProducts.length > 0);

    // Only occasions with at least one active, catalog-visible product — mirrors
    // /api/occasions so the footer never links to a dead-end "0 products" page.
    const occWithProducts = await prisma.productOccasion.findMany({
      where: {
        product: {
          status: "active",
          ...(hiddenCategoryIds.length > 0
            ? { categories: { none: { categoryId: { in: hiddenCategoryIds } } } }
            : {}),
        },
      },
      select: { occasionId: true },
      distinct: ["occasionId"],
    });
    const withProducts = new Set(occWithProducts.map((o) => o.occasionId));
    const occasions = occasionRows.filter((o) => withProducts.has(o.id));

    return { categories, collections: liveCollections, occasions };
  } catch (error) {
    console.error("Footer data fetch failed:", error);
    return { categories: [], collections: [], occasions: [] };
  }
}

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  if (links.length === 0) return null;
  return (
    <div>
      <h4 className="mb-3.5 text-[14px] font-semibold uppercase tracking-wider text-white">
        {title}
      </h4>
      {links.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className="mb-2 block text-[13px] text-white transition hover:text-white/80 underline-offset-2 hover:underline"
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

export async function Footer() {
  const { categories, collections, occasions } = await getFooterData();

  const productLinks: FooterLink[] = [
    ["/catalog", "All Products"],
    ["/categories", "All Categories"],
    // Indexable category landing pages, not filtered ?category= URLs.
    ...categories.map((c): FooterLink => [`/category/${c.slug}`, c.name]),
  ];
  const packLinks: FooterLink[] = [
    ["/curated-packs", "All Packs"],
    ...collections.map((c): FooterLink => [`/curated-packs/${c.slug}`, c.name]),
  ];
  const occasionLinks: FooterLink[] = occasions.map(
    (o): FooterLink => [`/occasion/${o.slug}`, o.name]
  );

  return (
    <footer className="bg-dark px-4 pt-12 pb-7 text-inv sm:px-8 lg:px-12 lg:pt-[72px]">
      <div className="container-gc-w">
        <div className="mb-10 grid grid-cols-2 gap-8 lg:grid-cols-[1.8fr_repeat(4,1fr)]">
          <div className="col-span-2 lg:col-span-1">
            <Image src="/footer_logo.png" alt="GIVOO Logo" width={160} height={40} className="mb-2.5 h-10 w-auto" />
            <p className="max-w-[260px] text-[13px] leading-relaxed text-white">
              India&apos;s first self-serve bulk gifting platform. Browse, build,
              and order branded corporate gifts with transparent pricing.
            </p>
            <div className="mt-4 flex gap-3">
              {["in", "x", "ig", "fb"].map((k) => (
                <a key={k} href="#" className="flex h-8 w-8 border border-white items-center justify-center rounded-full bg-white/5 text-sm transition hover:bg-white/10">
                  {k === "in" ? "in" : k === "x" ? "𝕏" : k === "ig" ? "◉" : "f"}
                </a>
              ))}
            </div>
          </div>

          <FooterColumn title="Products" links={productLinks} />
          <FooterColumn title="Curated Packs" links={packLinks} />
          <FooterColumn title="Occasions" links={occasionLinks} />
          <FooterColumn title="Company" links={COL_COMPANY} />
        </div>

        <div className="flex flex-col justify-between gap-3 border-t border-white/5 pt-5 text-[11px] text-white sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} GIVOO by Arts Shala. All rights reserved.</span>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {LEGAL_LINKS.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="text-white underline-offset-2 transition hover:text-white/80 hover:underline"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
