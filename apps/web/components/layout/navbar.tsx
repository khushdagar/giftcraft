"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, ShoppingBag, Package, User as UserIcon, LogOut, LayoutDashboard, Phone, Search } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useBuilderStore } from "@/store/builder";
import { BrandLogo } from "@/components/layout/brand-logo";
import { CONTACT_FALLBACK } from "@/lib/constants";

interface NavLink { name: string; slug: string }

interface SuggestProduct { id: string; name: string; slug: string; brand: string | null; image: string | null; price: number | null }
interface SuggestCategory { id: string; name: string; slug: string }

// Shown until the live occasions load (and if the fetch fails), so the menu
// is never empty.
const FALLBACK_OCCASIONS: NavLink[] = [
  { name: "Diwali", slug: "diwali" },
  { name: "Holi", slug: "holi" },
  { name: "Christmas", slug: "christmas" },
  { name: "New Year", slug: "new-year" },
  { name: "Women's Day", slug: "womens-day" },
  { name: "Onboarding", slug: "onboarding" },
  { name: "Client Gifting", slug: "client-gifting" },
  { name: "Birthday", slug: "birthday" },
  { name: "Anniversary", slug: "anniversary" },
];

// Until /api/settings/contact answers — same default the contact API falls back
// to, so the number never renders blank or shifts the layout.
const DEFAULT_PHONE = CONTACT_FALLBACK.phone;

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [phone, setPhone] = useState(DEFAULT_PHONE);
  const [suggestions, setSuggestions] = useState<{ products: SuggestProduct[]; categories: SuggestCategory[] }>({ products: [], categories: [] });
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [categories, setCategories] = useState<NavLink[]>([]);
  const [collections, setCollections] = useState<NavLink[]>([]);
  const [occasions, setOccasions] = useState<NavLink[]>(FALLBACK_OCCASIONS);
  const products = useBuilderStore((state) => state.products);

  // The builder store is persisted to localStorage, which only exists on the
  // client. Rendering its count before hydration would mismatch the server HTML
  // and make the cart badge pop in and out — wait until we're mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const productCount = mounted ? products.length : 0;

  // Until the session resolves we know neither "signed in" nor "signed out".
  // Rendering either one would flip to the other a moment later — that's the
  // flicker. Hold a same-sized placeholder instead.
  const authLoading = status === "loading";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Categories (Products dropdown) and collections (Curated Packs dropdown).
  useEffect(() => {
    let active = true;
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (!active || !Array.isArray(res?.data)) return;
        setCategories(res.data.map((c: any) => ({ name: c.name, slug: c.slug })));
      })
      .catch(() => {/* no dropdown if it fails */});
    fetch("/api/collections")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !Array.isArray(data)) return;
        setCollections(data.map((c: any) => ({ name: c.name, slug: c.slug })));
      })
      .catch(() => {/* no dropdown if it fails */});
    fetch("/api/occasions")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !Array.isArray(data) || data.length === 0) return;
        setOccasions(data.map((o: any) => ({ name: o.name, slug: o.slug })));
      })
      .catch(() => {/* keep fallback */});
    fetch("/api/settings/contact")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data?.phone) return;
        setPhone(data.phone);
      })
      .catch(() => {/* keep default number */});
    return () => { active = false; };
  }, []);

  // Typeahead. Debounced so a fast typist fires one request, not one per key;
  // `reqId` drops responses that land after a newer query was already issued.
  const suggestReq = useRef(0);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions({ products: [], categories: [] });
      setSuggestLoading(false);
      return;
    }
    setSuggestLoading(true);
    const id = ++suggestReq.current;
    const timer = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (id !== suggestReq.current) return;
          setSuggestions({ products: data?.products ?? [], categories: data?.categories ?? [] });
          setSuggestLoading(false);
        })
        .catch(() => {
          if (id !== suggestReq.current) return;
          setSuggestLoading(false);
        });
    }, 220);
    return () => clearTimeout(timer);
  }, [query]);

  const userInitial = session?.user?.name?.[0]?.toUpperCase() ?? "G";
  // tel: links only accept digits and a leading + — strip the display spacing.
  const phoneHref = `tel:${phone.replace(/[^\d+]/g, "")}`;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setMobileOpen(false);
    setMobileSearchOpen(false);
    setSuggestOpen(false);
    // The catalog seeds its own box from ?search=, so leaving the term in the
    // navbar would just duplicate it — reset for the next search.
    setQuery("");
    router.push(`/catalog?search=${encodeURIComponent(q)}`);
  };

  const goToSuggestion = (href: string) => {
    setSuggestOpen(false);
    setMobileOpen(false);
    setMobileSearchOpen(false);
    setQuery("");
    router.push(href);
  };

  /** Shared markup for both the desktop and mobile suggestion panels. */
  const suggestionPanel = (
    <div className="absolute left-0 right-0 top-full z-[750] mt-2 overflow-hidden rounded-md-s border border-bdr bg-white shadow-float">
      {suggestLoading && suggestions.products.length === 0 && suggestions.categories.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-ink-3">Searching…</p>
      ) : suggestions.products.length === 0 && suggestions.categories.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-ink-3">No matches for “{query.trim()}”</p>
      ) : (
        <>
          {suggestions.categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => goToSuggestion(`/category/${c.slug}`)}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-[13px] font-medium text-ink-2 transition hover:bg-elevated"
            >
              <Search className="h-3.5 w-3.5 text-ink-3" />
              {c.name}
              <span className="ml-auto text-[11px] text-ink-3">Category</span>
            </button>
          ))}
          {suggestions.products.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => goToSuggestion(`/products/${p.slug}`)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-elevated"
            >
              <span className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-elevated">
                {p.image && (
                  // Suggestion thumbnails are tiny and short-lived — plain img avoids
                  // queueing a next/image optimisation per keystroke.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" className="h-full w-full object-cover" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">{p.name}</span>
                {p.brand && <span className="block truncate text-[11px] text-ink-3">{p.brand}</span>}
              </span>
              {p.price !== null && (
                <span className="shrink-0 text-[12px] font-semibold tabular-nums text-ink-2">₹{p.price}</span>
              )}
            </button>
          ))}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => goToSuggestion(`/catalog?search=${encodeURIComponent(query.trim())}`)}
            className="w-full border-t border-bdr px-4 py-2.5 text-left text-[12px] font-semibold text-em transition hover:bg-elevated"
          >
            See all results for “{query.trim()}”
          </button>
        </>
      )}
    </div>
  );

  return (
    <>
      <nav
        className={cn(
          "glass sticky top-0 z-[700] flex h-14 items-center justify-between px-4 sm:px-8 lg:px-10 transition-shadow",
          scrolled && "shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.04)]"
        )}
      >
        <Link href="/" className="flex items-center">
          <BrandLogo className="h-9 w-auto" />
        </Link>

        <ul className="hidden items-center gap-7 nav:flex">
          {/* <li><Link href="/" className="text-sm font-medium text-ink-2 hover:text-ink">Home</Link></li> */}
          {/* Products dropdown — all categories in 4 columns */}
          <li className="group relative py-4">
            <Link href="/catalog" className="text-sm font-medium text-ink-2 hover:text-ink">Products ▾</Link>
            {categories.length > 0 && (
              <div className="invisible absolute left-1/2 top-full grid min-w-[640px] -translate-x-1/2 grid-cols-4 gap-1 rounded-md-s border border-bdr bg-white p-4 opacity-0 shadow-float transition-all group-hover:visible group-hover:opacity-100">
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    // Indexable category landing page, not a filtered ?category= URL.
                    href={`/category/${c.slug}`}
                    className="rounded-md px-3 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-elevated hover:text-ink"
                  >
                    {c.name}
                  </Link>
                ))}
                
              </div>
            )}
          </li>

          {/* Curated Packs dropdown — curated collections */}
          <li className="group relative py-4">
            <Link href="/curated-packs" className="text-sm font-medium text-ink-2 hover:text-ink">Curated Packs ▾</Link>
            {collections.length > 0 && (
              <div className="invisible absolute left-1/2 top-full grid min-w-[280px] -translate-x-1/2 grid-cols-1 gap-1 rounded-md-s border border-bdr bg-white p-4 opacity-0 shadow-float transition-all group-hover:visible group-hover:opacity-100">
                <Link
                  href="/curated-packs"
                  className="rounded-md px-3 py-2 text-[13px] font-semibold text-ink transition hover:bg-elevated"
                >
                  All Packs
                </Link>
                {collections.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/curated-packs/${c.slug}`}
                    className="rounded-md px-3 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-elevated hover:text-ink"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
          </li>

          {/* Occasions dropdown — seasonal & gifting occasions */}
          <li className="group relative py-4">
            <button className="text-sm font-medium text-ink-2 hover:text-ink">Occasions ▾</button>
            {occasions.length > 0 && (
              <div className="invisible absolute left-1/2 top-full grid min-w-[480px] -translate-x-1/2 grid-cols-3 gap-1 rounded-md-s border border-bdr bg-white p-4 opacity-0 shadow-float transition-all group-hover:visible group-hover:opacity-100">
                {occasions.map((o) => (
                  <Link
                    key={o.slug}
                    href={`/occasion/${o.slug}`}
                    className="rounded-md px-3 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-elevated hover:text-ink"
                  >
                    {o.name}
                  </Link>
                ))}
              </div>
            )}
          </li>

          <li><Link href="/box" className="text-sm font-medium text-ink-2 hover:text-ink">Build Your Pack</Link></li>
          {/* <li><Link href="/blog" className="text-sm font-medium text-ink-2 hover:text-ink">Blog</Link></li> */}
          <li><Link href="/contact" className="text-sm font-medium text-ink-2 hover:text-ink">Contact</Link></li>
        </ul>

        <div className="flex items-center gap-3">
          {/* Search — submits to the catalog, which seeds its search box from ?search= */}
          <form
            role="search"
            onSubmit={submitSearch}
            className="relative hidden items-center nav:flex"
          >
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-ink-3" />
            <input
              type="search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSuggestOpen(true); }}
              onFocus={() => setSuggestOpen(true)}
              onBlur={() => setSuggestOpen(false)}
              onKeyDown={(e) => { if (e.key === "Escape") setSuggestOpen(false); }}
              placeholder="Search gifts..."
              aria-label="Search products"
              className="h-9 w-36 rounded-full border border-bdr bg-white pl-9 pr-3 text-[13px] text-ink outline-none transition placeholder:text-ink-3 focus:border-em xl:w-52"
            />
            {suggestOpen && query.trim().length >= 2 && (
              <div className="absolute left-1/2 top-full w-80 -translate-x-1/2">{suggestionPanel}</div>
            )}
          </form>

          <a
            href={phoneHref}
            title="Call us"
            className="hidden bg-em items-center gap-2 nav:inline-flex rounded-sm px-2"
          >
            <span className="flex h-8 w-8 shrink-0 m-1 bg-white items-center justify-center rounded-full  text-em">
              <Phone className="h-5 w-5" />
            </span>
            {/* All or nothing: below 1100px the nav is too tight, so the whole
                pill hides rather than showing a bare icon. */}
            <span className="block leading-tight">
              <span className="block text-[10px] text-white">Help is here</span>
              <span className="block text-[13px] font-semibold text-white">{phone}</span>
            </span>
          </a>

          {authLoading ? (
            // Same 36px footprint as both real states, so nothing shifts when it resolves.
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full"
              aria-busy="true"
              aria-label="Checking sign-in status"
            >
              <div className="h-9 w-9 animate-pulse rounded-full bg-elevated" />
            </div>
          ) : session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-elevated" aria-label={`Account menu for ${session.user?.name}`}>
                  <Avatar className="h-9 w-9">
                    {session.user?.image && <AvatarImage src={session.user.image} alt={session.user?.name ?? ""} />}
                    <AvatarFallback>{userInitial}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="flex flex-col gap-0.5 normal-case tracking-normal">
                  <span className="text-sm font-semibold text-ink">{session.user.name}</span>
                  <span className="text-[11px] font-normal text-ink-3">{session.user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/orders"><Package className="h-4 w-4" /> My Orders</Link>
                </DropdownMenuItem>
                {session.user.role === "super_admin" && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin"><UserIcon className="h-4 w-4" /> Admin Panel</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            // Route through the real /login page (which handles Google + the
            // callback URL) rather than firing signIn() straight from the nav —
            // that skipped the page and lost the "return here afterwards" target.
            <Link
              href={`/login?from=${encodeURIComponent(pathname || "/")}`}
              className="flex border border-[#800020] h-9 w-9 items-center justify-center rounded-full text-ink-2 transition hover:bg-elevated hover:text-ink"
              aria-label="Sign in"
            >
              <UserIcon className="h-5 w-5" />
            </Link>
          )}

          <Link href="/builder" className="relative border border-[#800020] flex h-9 w-9 items-center justify-center rounded-full text-ink-2 transition hover:bg-elevated hover:text-ink" aria-label="Gift Pack">
            <ShoppingBag className="h-5 w-5" />
            {productCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-em text-white text-[10px] font-bold">
                {productCount}
              </span>
            )}
          </Link>

          {/* Mobile search toggle — the header is too tight for a full input,
              so the box drops down under the bar. */}
          <button
            onClick={() => setMobileSearchOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#800020] text-ink-2 transition hover:bg-elevated hover:text-ink lg:hidden"
            aria-label="Search products"
            aria-expanded={mobileSearchOpen}
          >
            <Search className="h-5 w-5" />
          </button>

          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink nav:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Mobile search drop-down (below the bar, above page content) */}
      {mobileSearchOpen && (
        <div className="sticky top-14 z-[690] border-b border-bdr bg-white px-4 py-3 nav:hidden">
          <form role="search" onSubmit={submitSearch} className="relative flex items-center">
            <Search className="pointer-events-none absolute left-4 h-4 w-4 text-ink-3" />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setMobileSearchOpen(false); }}
              placeholder="Search gifts..."
              aria-label="Search products"
              className="h-11 w-full rounded-full border border-bdr bg-white pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-em"
            />
            {query.trim().length >= 2 && suggestionPanel}
          </form>
        </div>
      )}

      {/* Mobile menu */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-[799] bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-[800] flex w-full max-w-[380px] flex-col bg-white p-6 shadow-float">
            <div className="mb-8 flex items-center justify-between">
              <BrandLogo className="h-8 w-auto" />
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-elevated"
              >✕</button>
            </div>

            <form role="search" onSubmit={submitSearch} className="relative mb-6 flex items-center">
              <Search className="pointer-events-none absolute left-4 h-4 w-4 text-ink-3" />
              <input
                type="search"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSuggestOpen(true); }}
                placeholder="Search gifts..."
                aria-label="Search products"
                className="h-11 w-full rounded-full border border-bdr bg-white pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-em"
              />
              {query.trim().length >= 2 && suggestionPanel}
            </form>

            {[
              ["/", "Home"], ["/catalog", "Products"], ["/categories", "Categories"],
              ["/curated-packs", "Curated Box"], ["/box", "Build Your Box"], ["/blog", "Blog"], ["/contact", "Contact"],
              ["/dashboard", "Dashboard"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href!}
                className="block border-b border-bdr py-4 text-lg font-medium text-ink hover:text-em"
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </Link>
            ))}
          
            {authLoading ? (
              <div
                className="mt-3 h-[60px] w-full animate-pulse rounded-md-p bg-elevated"
                aria-busy="true"
                aria-label="Checking sign-in status"
              />
            ) : session?.user ? (
              <button
                onClick={() => {
                  setMobileOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-md-p border-2 border-bdr py-4 text-base font-semibold text-ink hover:border-em hover:text-em"
              >
                <LogOut className="h-5 w-5" /> Sign out
              </button>
            ) : (
              <Link
                href={`/login?from=${encodeURIComponent(pathname || "/")}`}
                onClick={() => setMobileOpen(false)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-md-p border-2 border-bdr py-4 text-base font-semibold text-ink hover:border-em hover:text-em"
              >
                <UserIcon className="h-5 w-5" /> Sign in
              </Link>
            )}

            <a href={phoneHref} className="mt-6 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-em text-white">
                <Phone className="h-5 w-5" />
              </span>
              <span className="leading-tight">
                <span className="block text-[11px] text-ink-3">Help is here</span>
                <span className="block text-sm font-semibold text-ink">{phone}</span>
              </span>
            </a>
          </div>
        </>
      )}
    </>
  );
}
