'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Package, DollarSign, User, LogOut, Menu, X } from 'lucide-react';
import { BrandLogo } from '@/components/layout/brand-logo';

const NAV = [
  { href: '/vendor/dashboard', label: 'Dashboard', icon: null, emoji: '📊' },
  { href: '/vendor/po', label: 'Purchase Orders', icon: Package, emoji: null },
  { href: '/vendor/payments', label: 'Payments', icon: DollarSign, emoji: null },
  { href: '/vendor/profile', label: 'Profile', icon: User, emoji: null },
];

interface Props {
  userName?: string | null;
}

/**
 * Mobile header (logo + hamburger) and offcanvas drawer for the vendor portal.
 * Shown only below lg, where the fixed sidebar is hidden.
 */
export function VendorMobileNav({ userName }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-[60] flex h-14 items-center justify-between border-b-2 border-bdr bg-white px-4 lg:hidden">
      <Link href="/vendor/dashboard" className="flex items-center gap-2">
        <BrandLogo className="h-8 w-auto" />
        <span className="text-xs text-ink-3">Vendor</span>
      </Link>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-md text-ink hover:bg-gray-100"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[900]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 flex h-full w-[280px] max-w-[85vw] flex-col bg-white shadow-float">
            <div className="flex items-center justify-between border-b-2 border-bdr px-6 py-5">
              <div>
                <BrandLogo className="h-8 w-auto" />
                <p className="mt-1 text-xs text-ink-3">Vendor Portal</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-ink-2 hover:bg-gray-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-md px-4 py-3 text-sm font-normal text-ink-2 transition hover:bg-gray-100 hover:text-ink"
                >
                  {item.emoji ? <span>{item.emoji}</span> : item.icon ? <item.icon className="h-5 w-5" /> : null}
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="space-y-3 border-t-2 border-bdr px-4 py-4">
              <div className="rounded-md bg-gray-50 px-4 py-3">
                <p className="text-xs text-ink-3">Logged in as</p>
                <p className="truncate text-sm font-normal text-ink">{userName}</p>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-bdr px-4 py-2 text-sm font-normal text-ink-2 transition hover:bg-gray-50 hover:text-ink"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
