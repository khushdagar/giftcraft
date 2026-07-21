import Link from "next/link";

// Eco-Friendly and Premium are tag-driven collections (OccasionConfig rows with
// isCollection), so they filter the catalog through the ?occasion= param that
// the sidebar already understands — the slugs must match the seeded ones.
const COL_PRODUCT = [
  ["/catalog", "All Products"],
  ["/packs", "Curated Packs"],
  ["/catalog?occasion=eco-friendly", "Eco-Friendly"],
  ["/catalog?occasion=premium-executive", "Premium"],
];
const COL_COMPANY = [
  ["/blog", "Blog"],
  ["/sell-with-us", "Sell With Us"],
];
const COL_HELP = [
  ["/faq", "FAQ"],
  ["/shipping", "Shipping"],
  ["/returns", "Returns"],
  ["/contact", "Contact"],
];
const COL_LEGAL = [
  ["/terms", "Terms"],
  ["/privacy", "Privacy"],
  ["/gst", "GST Info"],
];

export function Footer() {
  return (
    <footer className="bg-dark px-4 pt-12 pb-7 text-inv sm:px-8 lg:px-12 lg:pt-[72px]">
      <div className="container-gc-w">
        <div className="mb-10 grid grid-cols-2 gap-8 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <div>
            <p className="mb-2.5 font-display text-[22px] italic font-medium text-em-400">GiftCraft</p>
            <p className="max-w-[260px] text-[13px] leading-relaxed text-inv/35">
              India&apos;s first self-serve bulk gifting platform. Browse, build,
              and order branded corporate gifts with transparent pricing.
            </p>
            <p className="mt-3 text-xs italic text-inv/25">
              Arts Shala · Delhi, India
            </p>
            <div className="mt-4 flex gap-3">
              {["in", "x", "ig", "fb"].map((k) => (
                <a key={k} href="#" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-sm transition hover:bg-white/10">
                  {k === "in" ? "in" : k === "x" ? "𝕏" : k === "ig" ? "◉" : "f"}
                </a>
              ))}
            </div>
          </div>

          {[
            ["Product", COL_PRODUCT],
            ["Company", COL_COMPANY],
            ["Help", COL_HELP],
            ["Legal", COL_LEGAL],
          ].map(([title, links]) => (
            <div key={title as string}>
              <h4 className="mb-3.5 text-[11px] font-semibold uppercase tracking-wider text-inv/55">
                {title as string}
              </h4>
              {(links as [string, string][]).map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="mb-2 block text-[13px] text-inv/35 transition hover:text-inv/75"
                >
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="flex flex-col justify-between gap-1.5 border-t border-white/5 pt-5 text-[11px] text-inv/20 sm:flex-row">
          <span>© {new Date().getFullYear()} GiftCraft by Arts Shala. All rights reserved.</span>
          <span>GSTIN {process.env.SELLER_GSTIN ?? "07XXXXXXXXX1Z5"} · Delhi</span>
        </div>
      </div>
    </footer>
  );
}
