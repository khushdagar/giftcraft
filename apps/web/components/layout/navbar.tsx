"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, ShoppingBag, Package, User as UserIcon, LogOut, LayoutDashboard, Phone, Search, ChevronDown, Heart, X } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useBuilderStore } from "@/store/builder";
import { useWishlistStore } from "@/store/wishlist";
import { BrandLogo } from "@/components/layout/brand-logo";
import { CONTACT_FALLBACK } from "@/lib/constants";

interface NavLink { name: string; slug: string }

// The Curated Packs dropdown cascades two levels: entry ("By Budget", "By
// Occasion") → its rungs. Individual packs are deliberately absent — the menu
// hands you to a listing page, it isn't a catalogue of its own.
interface NavSubCollection extends NavLink {}
interface NavCollection extends NavLink {
  children: NavSubCollection[];
}

interface SuggestProduct { id: string; name: string; slug: string; brand: string | null; image: string | null; price: number | null }
interface SuggestPack { id: string; name: string; slug: string; image: string | null; price: number | null }
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

// Festival-style occasions, so the long occasion cascade can lead with them
// instead of interleaving them with the evergreen themes.
const FESTIVAL_RE =
  /diwali|holi|christmas|new year|festive|eid|rakhi|raksha|navratri|pongal|onam|ganesh|dussehra|dasara|lohri|baisakhi|valentine|easter|halloween|ugadi|sankranti|janmashtami|thanksgiving|independence|republic/i;

// Festivals first, everything else after — the cascade then splits the list
// down the middle into two even columns.
function orderOccasionRungs<T extends NavLink>(items: T[]): T[] {
  return [
    ...items.filter((i) => FESTIVAL_RE.test(i.name)),
    ...items.filter((i) => !FESTIVAL_RE.test(i.name)),
  ];
}

// Until /api/settings/contact answers — same default the contact API falls back
// to, so the number never renders blank or shifts the layout.
const DEFAULT_PHONE = CONTACT_FALLBACK.phone;

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const path = pathname ?? "";

  // Top-level tab: brand-coloured label plus an underline, so the section you
  // are in is readable at a glance.
  const topLinkClass = (active: boolean) =>
    cn(
      "text-sm font-medium transition-colors hover:text-em",
      active ? "text-em" : "text-ink-2"
    );
  const activeBar = (active: boolean) =>
    active ? (
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-em" />
    ) : null;

  // Dropdown row: brand tint on hover, and the row for the page you are
  // already on stays tinted.
  const menuItemClass = (active: boolean, extra = "") =>
    cn(
      "rounded-md px-3 py-2 text-[13px] transition-colors",
      active
        ? "bg-em-50 font-semibold text-em"
        : "font-medium text-ink-2 hover:bg-em-50 hover:text-em",
      extra
    );

  const inProducts =
    path.startsWith("/catalog") ||
    path.startsWith("/category") ||
    path.startsWith("/products");
  const inPacks = path.startsWith("/curated-packs");
  const inOccasions = path.startsWith("/occasion");
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  // Which mobile accordion is expanded — one at a time, mirroring the desktop
  // hover dropdowns (Products / Curated Packs / Occasions).
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [phone, setPhone] = useState(DEFAULT_PHONE);
  const [suggestions, setSuggestions] = useState<{ products: SuggestProduct[]; packs: SuggestPack[]; categories: SuggestCategory[] }>({ products: [], packs: [], categories: [] });
  const [suggestOpen, setSuggestOpen] = useState(false);
  // The nav only carries a search icon; the field itself lives in a
  // full-screen overlay so it has room to breathe on every viewport.
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [categories, setCategories] = useState<NavLink[]>([]);
  const [collections, setCollections] = useState<NavCollection[]>([]);
  // Which row the second column is anchored to. A slug, not an index, so a
  // refetch mid-hover can't point the column at the wrong row.
  const [hoveredCollection, setHoveredCollection] = useState<string | null>(null);
  const [occasions, setOccasions] = useState<NavLink[]>(FALLBACK_OCCASIONS);
  const products = useBuilderStore((state) => state.products);
  const wishlistItems = useWishlistStore((state) => state.items);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const productCount = mounted ? products.length : 0;
  const wishlistCount = mounted ? wishlistItems.length : 0;

  const authLoading = status === "loading";

  // Resolved from the hovered slug each render, so the column never points at a
  // row that has since disappeared from the fetched tree.
  const activeCollection = collections.find((c) => c.slug === hoveredCollection) ?? null;

  // Opening is a click, so the caret has to follow it into the overlay.
  // Escape closes from anywhere, and the page behind is frozen so the
  // overlay doesn't scroll the catalogue underneath it.
  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSearchOpen(false); };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [searchOpen]);

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
    fetch("/api/pack-nav")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !Array.isArray(data)) return;
        setCollections(
          data.map((c: any) => ({
            name: c.name,
            slug: c.slug,
            children: Array.isArray(c.children) ? c.children : [],
          }))
        );
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

  const suggestReq = useRef(0);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions({ products: [], packs: [], categories: [] });
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
          setSuggestions({ products: data?.products ?? [], packs: data?.packs ?? [], categories: data?.categories ?? [] });
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
  const phoneHref = `tel:${phone.replace(/[^\d+]/g, "")}`;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setMobileOpen(false);
    setMobileSearchOpen(false);
    setSuggestOpen(false);
    setSearchOpen(false);
  
    setQuery("");
    router.push(`/catalog?search=${encodeURIComponent(q)}`);
  };

  const goToSuggestion = (href: string) => {
    setSuggestOpen(false);
    setSearchOpen(false);
    setMobileOpen(false);
    setMobileSearchOpen(false);
    setQuery("");
    router.push(href);
  };

  /** Shared markup for both the desktop and mobile suggestion panels. */
  const suggestionPanel = (
    <div className="absolute left-0 right-0 top-full z-[750] mt-2 overflow-hidden rounded-md-s border border-bdr bg-white shadow-float">
      {suggestLoading && suggestions.products.length === 0 && suggestions.packs.length === 0 && suggestions.categories.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-ink-3">Searching…</p>
      ) : suggestions.products.length === 0 && suggestions.packs.length === 0 && suggestions.categories.length === 0 ? (
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
          {suggestions.packs.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => goToSuggestion(`/products/${p.slug}`)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-elevated"
            >
              <span className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-elevated">
                {p.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" className="h-full w-full object-cover" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">{p.name}</span>
                <span className="block truncate text-[11px] text-ink-3">Curated pack</span>
              </span>
              {p.price !== null && (
                <span className="shrink-0 text-[12px] font-semibold tabular-nums text-ink-2">₹{p.price}</span>
              )}
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
     
      <div className="sticky top-0 z-[700] flex h-8 items-center justify-center bg-em px-4 text-white">
        <span className="truncate text-[11px] sm:text-xs">
          <span className="sm:hidden">Pay only after you approve your mockup — <b>₹0 today.</b></span>
          <span className="hidden sm:inline">
            Order with zero payment today — pay only after you approve your branded mockup.
          </span>
        </span>
      </div>
      <nav
        className={cn(
          "glass sticky top-8 z-[700] flex h-14 items-center justify-between px-4 sm:px-8 lg:px-10 transition-shadow",
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
            <Link href="/catalog" className={topLinkClass(inProducts)}>Products ▾</Link>
            {activeBar(inProducts)}
            {categories.length > 0 && (
              <div className="invisible absolute left-0 top-full grid max-h-[calc(100vh-8rem)] min-w-[640px] grid-cols-4 gap-x-1 gap-y-0 overflow-y-auto overscroll-contain rounded-md-s border border-bdr bg-white p-3 opacity-0 shadow-float transition-all group-hover:visible group-hover:opacity-100">
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    // Indexable category landing page, not a filtered ?category= URL.
                    href={`/category/${c.slug}`}
                    className={menuItemClass(
                      path === `/category/${c.slug}`,
                      "px-2.5 py-1.5 leading-snug"
                    )}
                  >
                    {c.name}
                  </Link>
                ))}
                
              </div>
            )}
          </li>

          {/* Curated Packs dropdown — a three-column cascade: collections,
              then the hovered one's sub-collections (or its own packs when it
              has none), then the hovered sub-collection's packs. */}
          <li
            className="group relative py-4"
            onMouseLeave={() => setHoveredCollection(null)}
          >
            <Link href="/curated-packs" className={topLinkClass(inPacks)}>Curated Packs ▾</Link>
            {activeBar(inPacks)}
            {collections.length > 0 && (
              <div className="invisible absolute left-0 top-full flex rounded-md-s border border-bdr bg-white p-2 opacity-0 shadow-float transition-all group-hover:visible group-hover:opacity-100">
                {/* Column 1 — collections */}
                <div className="flex w-[240px] flex-col gap-1 p-2">
                  <Link
                    href="/curated-packs"
                    className={menuItemClass(path === "/curated-packs", "font-semibold")}
                    onMouseEnter={() => setHoveredCollection(null)}
                  >
                    All Packs
                  </Link>
                  {collections.map((c) => {
                    const hasMore = c.children.length > 0;
                    return (
                      <Link
                        key={c.slug}
                        href={`/curated-packs/${c.slug}`}
                        onMouseEnter={() => setHoveredCollection(c.slug)}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-[13px] transition-colors",
                          // Hovering a row previews its rungs, so it reads as
                          // selected for as long as the cascade is open.
                          hoveredCollection === c.slug || path.startsWith(`/curated-packs/${c.slug}`)
                            ? "bg-em-50 font-semibold text-em"
                            : "font-medium text-ink-2 hover:bg-em-50 hover:text-em"
                        )}
                      >
                        <span className="truncate">{c.name}</span>
                        {hasMore && <span className="text-ink-3">›</span>}
                      </Link>
                    );
                  })}
                </div>

                {/* Column 2 — the hovered entry's rungs (price bands or
                    occasions). The cascade stops here; packs live on the
                    listing page each rung opens. */}
                {activeCollection && activeCollection.children.length > 0 && (() => {
                  // A long rung list (occasions) overruns the viewport in one
                  // column, so split it evenly across two — festivals first.
                  const rungs = orderOccasionRungs(activeCollection.children);
                  const twoCol = rungs.length > 10;
                  const half = Math.ceil(rungs.length / 2);
                  const columns = twoCol ? [rungs.slice(0, half), rungs.slice(half)] : [rungs];
                  return (
                    <div className="border-l border-bdr p-2">
                      <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                        {activeCollection.name.replace(/^By /, "")}
                      </p>
                      <div className="flex gap-1">
                        {columns.map((col, ci) => (
                          <div key={ci} className="flex w-[220px] flex-col gap-1">
                            {col.map((sub) => (
                              <Link
                                key={sub.slug}
                                href={`/curated-packs/${activeCollection.slug}/${sub.slug}`}
                                className={menuItemClass(
                                  path === `/curated-packs/${activeCollection.slug}/${sub.slug}`,
                                  "truncate"
                                )}
                              >
                                {sub.name}
                              </Link>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </li>

          {/* Occasions dropdown — seasonal & gifting occasions */}
          <li className="group relative py-4">
            <button className={topLinkClass(inOccasions)}>Occasions ▾</button>
            {activeBar(inOccasions)}
            {occasions.length > 0 && (
              <div className="invisible absolute left-0 top-full grid max-h-[calc(100vh-8rem)] w-[min(44rem,calc(100vw-2rem))] grid-cols-3 gap-x-1 gap-y-0 overflow-y-auto overscroll-contain rounded-md-s border border-bdr bg-white p-3 opacity-0 shadow-float transition-all group-hover:visible group-hover:opacity-100 lg:grid-cols-4">
                {orderOccasionRungs(occasions).map((o) => (
                  <Link
                    key={o.slug}
                    href={`/occasion/${o.slug}`}
                    className={menuItemClass(
                      path === `/occasion/${o.slug}`,
                      "px-2.5 py-1.5 leading-snug"
                    )}
                  >
                    {o.name}
                  </Link>
                ))}
              </div>
            )}
          </li>

          <li className="relative py-4">
            <Link href="/box" className={topLinkClass(path.startsWith("/box"))}>Build Your Pack</Link>
            {activeBar(path.startsWith("/box"))}
          </li>
          {/* <li><Link href="/blog" className="text-sm font-medium text-ink-2 hover:text-ink">Blog</Link></li> */}
          <li className="relative py-4">
            <Link href="/contact" className={topLinkClass(path.startsWith("/contact"))}>Contact</Link>
            {activeBar(path.startsWith("/contact"))}
          </li>
        </ul>

        <div className="flex items-center gap-3">
          {/* Search — the nav holds only the trigger; the field opens as a
              full-screen overlay so it never squeezes the nav links. */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search products"
            aria-expanded={searchOpen}
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-[#800020] text-ink-2 transition hover:bg-elevated hover:text-ink nav:flex"
          >
            <Search className="h-5 w-5" />
          </button>

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
              className="order-3 flex h-9 w-9 items-center justify-center rounded-full lg:order-1"
              aria-busy="true"
              aria-label="Checking sign-in status"
            >
              <div className="h-9 w-9 animate-pulse rounded-full bg-elevated" />
            </div>
          ) : session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="order-3 flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-elevated lg:order-1" aria-label={`Account menu for ${session.user?.name}`}>
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
                {/* Mobile home for the wishlist — the header icon is lg-only. */}
                <DropdownMenuItem asChild className="lg:hidden">
                  <Link href="/wishlist">
                    <Heart className="h-4 w-4" /> Wishlist
                    {wishlistCount > 0 && (
                      <span className="ml-auto rounded-full bg-em px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {wishlistCount}
                      </span>
                    )}
                  </Link>
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
              className="order-3 flex border border-[#800020] h-9 w-9 items-center justify-center rounded-full text-ink-2 transition hover:bg-elevated hover:text-ink lg:order-1"
              aria-label="Sign in"
            >
              <UserIcon className="h-5 w-5" />
            </Link>
          )}

          {/* Wishlist icon — desktop only; on mobile it lives in the account
              dropdown instead so the icon row stays uncrowded. */}
          <Link href="/wishlist" className="order-2 relative border border-[#800020] hidden lg:flex h-9 w-9 items-center justify-center rounded-full text-ink-2 transition hover:bg-elevated hover:text-ink" aria-label="Wishlist">
            <Heart className="h-5 w-5" />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-em text-white text-[10px] font-bold">
                {wishlistCount}
              </span>
            )}
          </Link>

          <Link href="/builder" className="order-2 relative border border-[#800020] flex h-9 w-9 items-center justify-center rounded-full text-ink-2 transition hover:bg-elevated hover:text-ink" aria-label="Gift Pack">
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
            className="order-1 flex h-9 w-9 items-center justify-center rounded-full border border-[#800020] text-ink-2 transition hover:bg-elevated hover:text-ink lg:hidden"
            aria-label="Search products"
            aria-expanded={mobileSearchOpen}
          >
            <Search className="h-5 w-5" />
          </button>

          <button
            onClick={() => setMobileOpen(true)}
            className="order-4 flex h-9 w-9 items-center justify-center rounded-full text-ink nav:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Full-screen search overlay. Opened from the nav icon, dismissed by
          the backdrop, the ✕, or Escape. */}
      {searchOpen && (
        <div className="fixed inset-0 z-[900] flex justify-center overflow-y-auto bg-ink/40 px-4 py-[12vh] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Search">
          {/* Backdrop sits behind the card so a click outside closes, but a
              click on the card itself does not. */}
          <button
            type="button"
            aria-label="Close search"
            tabIndex={-1}
            onClick={() => setSearchOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default"
          />
          <div className="relative z-10 h-fit w-full max-w-2xl rounded-md-p border border-bdr bg-white p-5 shadow-float sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-3">Search</p>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-2 transition hover:bg-elevated hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form role="search" onSubmit={submitSearch} className="relative flex items-center">
              <Search className="pointer-events-none absolute left-4 h-5 w-5 text-ink-3" />
              <input
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSuggestOpen(true); }}
                onFocus={() => setSuggestOpen(true)}
                placeholder="Search gifts, packs, categories…"
                aria-label="Search products"
                className="h-14 w-full rounded-full border border-bdr bg-white pl-12 pr-4 text-base text-ink outline-none transition placeholder:text-ink-3 focus:border-em"
              />
              {suggestOpen && query.trim().length >= 2 && suggestionPanel}
            </form>

            {/* Empty state — somewhere to go before a single key is pressed. */}
            {query.trim().length < 2 && (
              <div className="mt-6 space-y-5">
                {categories.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Browse categories</p>
                    <div className="flex flex-wrap gap-2">
                      {categories.slice(0, 8).map((c) => (
                        <button
                          key={c.slug}
                          type="button"
                          onClick={() => goToSuggestion(`/category/${c.slug}`)}
                          className="rounded-full border border-bdr px-3.5 py-1.5 text-[13px] font-medium text-ink-2 transition hover:border-em hover:text-em"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {occasions.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Shop by occasion</p>
                    <div className="flex flex-wrap gap-2">
                      {occasions.slice(0, 8).map((o) => (
                        <button
                          key={o.slug}
                          type="button"
                          onClick={() => goToSuggestion(`/occasion/${o.slug}`)}
                          className="rounded-full border border-bdr px-3.5 py-1.5 text-[13px] font-medium text-ink-2 transition hover:border-em hover:text-em"
                        >
                          {o.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-[12px] text-ink-3">
                  Press <kbd className="rounded border border-bdr px-1.5 py-0.5 text-[11px] font-semibold text-ink-2">Esc</kbd> to close
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile search drop-down (below the bar, above page content) */}
      {mobileSearchOpen && (
        <div className="sticky top-[5.5rem] z-[690] border-b border-bdr bg-white px-4 py-3 nav:hidden">
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
          <div className="fixed right-0 top-0 bottom-0 z-[800] flex w-full max-w-[380px] flex-col overflow-y-auto bg-white p-6 shadow-float">
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

            <Link
              href="/"
              className="block border-b border-bdr py-4 text-lg font-medium text-ink hover:text-em"
              onClick={() => setMobileOpen(false)}
            >
              Home
            </Link>

            {/* Same three dropdowns as desktop, as tap-to-expand accordions. The
                header itself still links to the landing page; the chevron toggles. */}
            {[
              { key: "products", label: "Products", href: "/catalog", items: categories, hrefFor: (s: string) => `/category/${s}` },
              { key: "packs", label: "Curated Packs", href: "/curated-packs", items: collections as NavLink[], hrefFor: (s: string) => `/curated-packs/${s}` },
              { key: "occasions", label: "Occasions", href: null, items: occasions, hrefFor: (s: string) => `/occasion/${s}` },
            ].map((section) => {
              const open = mobileSection === section.key;
              return (
                <div key={section.key} className="border-b border-bdr">
                  <div className="flex items-center justify-between">
                    {section.href ? (
                      <Link
                        href={section.href}
                        className="block flex-1 py-4 text-lg font-medium text-ink hover:text-em"
                        onClick={() => setMobileOpen(false)}
                      >
                        {section.label}
                      </Link>
                    ) : (
                      <span className="block flex-1 py-4 text-lg font-medium text-ink">{section.label}</span>
                    )}
                    {section.items.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setMobileSection(open ? null : section.key)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-elevated"
                        aria-expanded={open}
                        aria-label={`${open ? "Collapse" : "Expand"} ${section.label}`}
                      >
                        <ChevronDown className={cn("h-5 w-5 transition-transform", open && "rotate-180")} />
                      </button>
                    )}
                  </div>
                  {open && section.items.length > 0 && (
                    <div className="grid grid-cols-2 gap-1 pb-3">
                      {section.key === "packs" && (
                        <Link
                          href="/curated-packs"
                          onClick={() => setMobileOpen(false)}
                          className="col-span-2 rounded-md px-3 py-2 text-[13px] font-semibold text-ink hover:bg-elevated"
                        >
                          All Packs
                        </Link>
                      )}
                      {section.items.map((i) => (
                        <Link
                          key={i.slug}
                          href={section.hrefFor(i.slug)}
                          onClick={() => setMobileOpen(false)}
                          className="rounded-md px-3 py-2 text-[13px] font-medium text-ink-2 hover:bg-elevated hover:text-ink"
                        >
                          {i.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {[
              ["/box", "Build Your Pack"], ["/contact", "Contact"], ["/dashboard", "Dashboard"],
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
