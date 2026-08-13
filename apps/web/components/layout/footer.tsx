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
  ["/returns", "Return & Refund Policy"],
  ["/terms", "Terms & Conditions"],
];

// Live catalog data for the Products / Curated Packs / Collections columns.
// Wrapped so a DB hiccup degrades to fewer links instead of breaking every page.
async function getFooterData() {
  try {
    const [rawCategories, collections, occasionRows, hiddenCategoryIds] = await Promise.all([
      // Top-level categories only. Sub-categories belong on the category
      // landing page, not in the footer — listing every one of them turns this
      // column into an unreadable wall.
      //
      // Sub-category products count towards the parent: a product tagged only
      // "Insulated Steel Bottle" still makes "Drinkware" worth linking to.
      // Without that, a parent whose products all sit in children would be
      // dropped even though its landing page is populated.
      prisma.category.findMany({
        where: {
          parentId: null,
          OR: [
            { products: { some: { product: { status: "active", isPack: false } } } },
            { children: { some: { products: { some: { product: { status: "active", isPack: false } } } } } },
          ],
        },
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

// Cap for the catalog-driven columns. Occasions/categories grow unbounded as
// the catalog does — past ~10 the footer turns into a scrolling wall.
const MAX_COLUMN_LINKS = 10;

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

  const productLinks: FooterLink[] = ([
    ["/catalog", "All Products"],
    ["/categories", "All Categories"],
    // Indexable category landing pages, not filtered ?category= URLs.
    ...categories.map((c): FooterLink => [`/category/${c.slug}`, c.name]),
  ] as FooterLink[]).slice(0, MAX_COLUMN_LINKS);
  const packLinks: FooterLink[] = ([
    ["/curated-packs", "All Packs"],
    ...collections.map((c): FooterLink => [`/curated-packs/${c.slug}`, c.name]),
  ] as FooterLink[]).slice(0, MAX_COLUMN_LINKS);
  const occasionLinks: FooterLink[] = occasions
    .map((o): FooterLink => [`/occasion/${o.slug}`, o.name])
    .slice(0, MAX_COLUMN_LINKS);

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
              <a
                href="https://www.instagram.com/givoogifting/"
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 border border-white items-center justify-center rounded-full bg-white/5 transition hover:bg-white/10"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.336 3.608 1.311.975.975 1.249 2.242 1.311 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.336 2.633-1.311 3.608-.975.975-2.242 1.249-3.608 1.311-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.336-3.608-1.311-.975-.975-1.249-2.242-1.311-3.608C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.062-1.366.336-2.633 1.311-3.608.975-.975 2.242-1.249 3.608-1.311 1.266-.058 1.646-.07 4.85-.07zM12 0C8.741 0 8.332.014 7.052.072 5.197.157 3.355.673 2.014 2.014.673 3.355.157 5.197.072 7.052.014 8.332 0 8.741 0 12s.014 3.668.072 4.948c.085 1.855.601 3.697 1.942 5.038 1.341 1.341 3.183 1.857 5.038 1.942C8.332 23.986 8.741 24 12 24s3.668-.014 4.948-.072c1.855-.085 3.697-.601 5.038-1.942 1.341-1.341 1.857-3.183 1.942-5.038.058-1.28.072-1.689.072-4.948s-.014-3.668-.072-4.948c-.085-1.855-.601-3.697-1.942-5.038C20.645.673 18.803.157 16.948.072 15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              <a
                href="https://www.facebook.com/givoogifting/"
                aria-label="Facebook"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 border border-white items-center justify-center rounded-full bg-white/5 transition hover:bg-white/10"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.026 1.792-4.697 4.533-4.697 1.313 0 2.686.235 2.686.235v2.971h-1.513c-1.491 0-1.956.93-1.956 1.886v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
                </svg>
              </a>
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
