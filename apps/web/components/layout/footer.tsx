import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isHiddenCategory, getHiddenCategoryIds } from "@/lib/catalog-visibility";

type FooterLink = [href: string, label: string];

// Static column — all company, help & legal links together. Every href points
// at a page that actually exists.
const COL_COMPANY: FooterLink[] = [
  ["/blog", "Blog"],
  ["/sell-with-us", "Sell With Us"],
  ["/contact", "Contact"],
  ["/faq", "FAQ"],
  ["/shipping", "Shipping"],
  ["/returns", "Returns"],
  ["/terms", "Terms"],
  ["/privacy", "Privacy"],
  ["/gst", "GST Info"],
];

// Live catalog data for the Products / Curated Packs / Collections columns.
// Wrapped so a DB hiccup degrades to fewer links instead of breaking every page.
async function getFooterData() {
  try {
    const [rawCategories, collections, occasionRows, hiddenCategoryIds] = await Promise.all([
      prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
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
    ...categories.map((c): FooterLink => [`/catalog?category=${c.slug}`, c.name]),
  ];
  const packLinks: FooterLink[] = [
    ["/packs", "All Packs"],
    ...collections.map((c): FooterLink => [`/packs?collection=${c.slug}`, c.name]),
  ];
  const occasionLinks: FooterLink[] = occasions.map(
    (o): FooterLink => [`/catalog?occasion=${o.slug}`, o.name]
  );

  return (
    <footer className="bg-dark px-4 pt-12 pb-7 text-inv sm:px-8 lg:px-12 lg:pt-[72px]">
      <div className="container-gc-w">
        <div className="mb-10 grid grid-cols-2 gap-8 lg:grid-cols-[1.8fr_repeat(4,1fr)]">
          <div className="col-span-2 lg:col-span-1">
            <p className="mb-2.5 font-display text-[22px] italic font-medium text-em-400">GIVOO</p>
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

        <div className="flex flex-col justify-between gap-1.5 border-t border-white/5 pt-5 text-[11px] text-white sm:flex-row">
          <span>© {new Date().getFullYear()} GIVOO by Arts Shala. All rights reserved.</span>
          <span>GSTIN {process.env.SELLER_GSTIN ?? "07XXXXXXXXX1Z5"} · Delhi</span>
        </div>
      </div>
    </footer>
  );
}
