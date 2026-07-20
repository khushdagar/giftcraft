"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, ShoppingBag, Package, User as UserIcon, LogOut, LayoutDashboard, Phone } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useBuilderStore } from "@/store/builder";

interface NavOccasion { icon: string; name: string; slug: string }

// Shown until the live occasions load (and if the fetch fails), so the menu
// is never empty.
const FALLBACK_OCCASIONS: NavOccasion[] = [
  { icon: "🪔", name: "Diwali", slug: "diwali" },
  { icon: "🎨", name: "Holi", slug: "holi" },
  { icon: "🎄", name: "Christmas", slug: "christmas" },
  { icon: "🎆", name: "New Year", slug: "new-year" },
  { icon: "💝", name: "Women's Day", slug: "womens-day" },
  { icon: "👋", name: "Onboarding", slug: "onboarding" },
  { icon: "💼", name: "Client Gifting", slug: "client-gifting" },
  { icon: "🎂", name: "Birthday", slug: "birthday" },
  { icon: "🏆", name: "Anniversary", slug: "anniversary" },
];

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [occasions, setOccasions] = useState<NavOccasion[]>(FALLBACK_OCCASIONS);
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

  // Load occasions managed in the admin panel; keep fallback on empty/error.
  useEffect(() => {
    let active = true;
    fetch("/api/occasions")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !Array.isArray(data) || data.length === 0) return;
        setOccasions(
          data.map((o: any) => ({ icon: o.icon || "🎁", name: o.name, slug: o.slug }))
        );
      })
      .catch(() => {/* keep fallback */});
    return () => { active = false; };
  }, []);

  const userInitial = session?.user?.name?.[0]?.toUpperCase() ?? "G";

  return (
    <>
      <nav
        className={cn(
          "glass sticky top-0 z-[700] flex h-14 items-center justify-between px-4 sm:px-8 lg:px-10 transition-shadow",
          scrolled && "shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.04)]"
        )}
      >
        <Link href="/" className="font-display text-[22px] italic font-medium text-em">
          GiftCraft
        </Link>

        <ul className="hidden items-center gap-7 lg:flex">
          <li><Link href="/" className="text-sm font-medium text-ink-2 hover:text-ink">Home</Link></li>
          <li><Link href="/catalog" className="text-sm font-medium text-ink-2 hover:text-ink">Products</Link></li>

          {/* Occasions dropdown — hover-triggered */}
          <li className="group relative py-4">
            <button className="text-sm font-medium text-ink-2 hover:text-ink">Occasions ▾</button>
            <div className="glass invisible absolute left-1/2 top-full grid min-w-[480px] -translate-x-1/2 grid-cols-3 gap-1 rounded-md-s p-4 opacity-0 shadow-float transition-all group-hover:visible group-hover:opacity-100">
              {occasions.map((o) => (
                <Link
                  key={o.slug}
                  href={`/catalog?occasion=${o.slug}`}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-elevated hover:text-ink"
                >
                  <span className="text-lg">{o.icon}</span>
                  {o.name}
                </Link>
              ))}
            </div>
          </li>

          <li><Link href="/packs" className="text-sm font-medium text-ink-2 hover:text-ink">Curated Packs</Link></li>
          <li><Link href="/box" className="text-sm font-medium text-ink-2 hover:text-ink">Build Your Box</Link></li>
          <li><Link href="/blog" className="text-sm font-medium text-ink-2 hover:text-ink">Blog</Link></li>
          <li><Link href="/contact" className="text-sm font-medium text-ink-2 hover:text-ink">Contact</Link></li>
        </ul>

        <div className="flex items-center gap-3">
          <a
            href="tel:+919876543210"
            aria-label="Call us"
            title="Call us"
            className="hidden h-9 w-9 items-center justify-center rounded-full bg-em text-white transition-all hover:scale-[1.02] hover:bg-em-600 hover:shadow-glow lg:inline-flex"
          >
            <Phone className="h-5 w-5" />
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
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 transition hover:bg-elevated hover:text-ink"
              aria-label="Sign in"
            >
              <UserIcon className="h-5 w-5" />
            </Link>
          )}

          <Link href="/builder" className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-2 transition hover:bg-elevated hover:text-ink" aria-label="Gift Pack">
            <ShoppingBag className="h-5 w-5" />
            {productCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-em text-white text-[10px] font-bold">
                {productCount}
              </span>
            )}
          </Link>

          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-[799] bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-[800] flex w-full max-w-[380px] flex-col bg-white p-6 shadow-float">
            <div className="mb-8 flex items-center justify-between">
              <span className="font-display text-xl italic text-em">GiftCraft</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-elevated"
              >✕</button>
            </div>
            {[
              ["/", "Home"], ["/catalog", "Products"],
              ["/packs", "Curated Box"], ["/box", "Build Your Box"], ["/blog", "Blog"], ["/contact", "Contact"],
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
          </div>
        </>
      )}
    </>
  );
}
