import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isHiddenCategory } from "@/lib/catalog-visibility";
import Image from "next/image";

type FooterLink = [href: string, label: string];

// Static column — all company, help & legal links together. Every href points
// at a page that actually exists.
const COL_COMPANY: FooterLink[] = [
  ["/about", "About Us"],
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

const FEATURED_OCCASION_SLUGS = [
  "onboarding",
  "diwali",
  "events",
  "client-gifting",
  "festive",
  "recognition-rewards",
  "sustainable-gifting",
  "executive-gifting",
];

// Seasonal picks shown above the shortlist, in this order. Matched by name
// (case-insensitive) so they don't depend on whatever slug admin gave them.
const PINNED_OCCASION_NAMES = ["Christmas", "Winter Gifting", "New Year", "Farewell"];

// Same idea for the Categories column: the SEO team's shortlist, in this
// order. Still intersected with the live product-bearing categories below so
// an emptied or hidden category never leaves a dead link behind.
const FEATURED_CATEGORY_SLUGS = [
  "apparel",
  "bags-travel",
  "drinkware",
  "gourmet-hampers",
  "leather-accessories",
  "stationery-desk",
  "tech-gadgets",
  "wellness",
];

// Live catalog data for the Occasions / Budget / Categories columns.
// Wrapped so a DB hiccup degrades to fewer links instead of breaking every page.
async function getFooterData() {
  try {
    const [rawCategories, occasionRows, budgetBands] = await Promise.all([
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
          slug: { in: FEATURED_CATEGORY_SLUGS },
          OR: [
            { products: { some: { product: { status: "active", isPack: false } } } },
            { children: { some: { products: { some: { product: { status: "active", isPack: false } } } } } },
          ],
        },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.occasionConfig.findMany({
        where: {
          isActive: true,
          OR: [
            { slug: { in: FEATURED_OCCASION_SLUGS } },
            ...PINNED_OCCASION_NAMES.map((name) => ({
              name: { equals: name, mode: "insensitive" as const },
            })),
          ],
        },
        select: { slug: true, name: true },
      }),
      // Bands are admin-managed (/admin/budget-bands), so renames and re-ordering
      // show up here without a code change.
      prisma.budgetBand.findMany({
        where: { isActive: true },
        select: { slug: true, name: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    const categories = rawCategories
      .filter((c) => !isHiddenCategory(c))
      .sort(
        (a, b) =>
          FEATURED_CATEGORY_SLUGS.indexOf(a.slug) - FEATURED_CATEGORY_SLUGS.indexOf(b.slug)
      );

    const byName = new Map(occasionRows.map((o) => [o.name.trim().toLowerCase(), o]));
    const pinned = PINNED_OCCASION_NAMES.flatMap((name) => {
      const row = byName.get(name.toLowerCase());
      return row ? [row] : [];
    });
    const pinnedSlugs = new Set(pinned.map((o) => o.slug));
    const bySlug = new Map(occasionRows.map((o) => [o.slug, o]));
    const occasions = [
      ...pinned,
      ...FEATURED_OCCASION_SLUGS.flatMap((slug) => {
        const row = bySlug.get(slug);
        return row && !pinnedSlugs.has(slug) ? [row] : [];
      }),
    ];

    return { categories, occasions, budgetBands };
  } catch (error) {
    console.error("Footer data fetch failed:", error);
    return { categories: [], occasions: [], budgetBands: [] };
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
  const { categories, occasions, budgetBands } = await getFooterData();

  // Curated Packs lead the footer — they are the platform's core offer, and
  // the Occasions/Budget columns below drill straight into them.
  const packLinks: FooterLink[] = [
    ["/curated-packs", "All Packs"],
    ["/curated-packs/occasions", "By Occasion"],
    ["/curated-packs/budget", "By Budget"],
  ];
  const occasionLinks: FooterLink[] = occasions.map(
    (o): FooterLink => [`/curated-packs/occasions/${o.slug}`, o.name]
  );
  const budgetLinks: FooterLink[] = budgetBands.map(
    (b): FooterLink => [`/curated-packs/budget/${b.slug}`, b.name]
  );
  // Indexable category landing pages, not filtered ?category= URLs.
  const categoryLinks: FooterLink[] = categories.map(
    (c): FooterLink => [`/category/${c.slug}`, c.name]
  );

  return (
    <footer className="bg-dark px-4 pt-12 pb-7 text-inv sm:px-8 lg:px-12 lg:pt-[72px]">
      <div className="container-gc-w">
        <div className="mb-10 grid grid-cols-2 gap-8 lg:grid-cols-[1.8fr_repeat(5,1fr)]">
          <div className="col-span-2 lg:col-span-1">
            <Image src="/footer_logo.webp" alt="GIVOO Logo" width={160} height={40} className="mb-2.5 h-10 w-auto" />
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
              <a
                href="https://www.linkedin.com/company/givoo-corporate-gifting/"
                aria-label="LinkedIn"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 border border-white items-center justify-center rounded-full bg-white/5 transition hover:bg-white/10"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="https://www.youtube.com/@givoogifting"
                aria-label="YouTube"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 border border-white items-center justify-center rounded-full bg-white/5 transition hover:bg-white/10"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>

          <FooterColumn title="Curated Packs" links={packLinks} />
          <FooterColumn title="Occasions" links={occasionLinks} />
          <FooterColumn title="Budget" links={budgetLinks} />
          <FooterColumn title="Categories" links={categoryLinks} />
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
