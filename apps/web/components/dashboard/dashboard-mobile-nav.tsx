'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard, Package, FileText, FolderOpen, Building2,
  Settings, LogOut, AlertCircle, Bell, Menu, X,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/orders', icon: Package, label: 'Orders' },
  { href: '/dashboard/disputes', icon: AlertCircle, label: 'Disputes' },
  { href: '/dashboard/quotes', icon: FileText, label: 'Quotes' },
  { href: '/dashboard/assets', icon: FolderOpen, label: 'Brand Assets' },
  { href: '/dashboard/company', icon: Building2, label: 'Company' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
  { href: '/dashboard/settings/notifications', icon: Bell, label: 'Notifications' },
];

interface Props {
  userName?: string | null;
  userRole?: string | null;
  userImage?: string | null;
}

/**
 * Mobile header (logo + hamburger) and offcanvas drawer for the customer
 * dashboard. Shown only below lg, where the desktop sidebar is hidden.
 */
export function DashboardMobileNav({ userName, userRole, userImage }: Props) {
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
    <header className="sticky top-0 z-[60] flex h-14 items-center justify-between border-b border-bdr bg-dark px-4 text-inv lg:hidden">
      <Link href="/" className="font-display text-lg italic text-em-400">
        GiftCraft
      </Link>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-md text-inv hover:bg-white/10"
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
          <aside className="absolute left-0 top-0 flex h-full w-[280px] max-w-[85vw] flex-col bg-dark text-inv shadow-float">
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <div>
                <span className="font-display text-xl italic text-em-400">GiftCraft</span>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-white">Customer Portal</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-inv/70 hover:bg-white/10"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2 text-[13px]">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-white transition hover:bg-white/5"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-white/5 p-3">
              <div className="mb-2 flex items-center gap-2 px-2">
                <Avatar className="h-7 w-7">
                  {userImage && <AvatarImage src={userImage} />}
                  <AvatarFallback>{userName?.[0] ?? 'U'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-inv/70">{userName}</p>
                  <p className="truncate text-[10px] text-inv/30">{userRole}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-inv/50 hover:bg-white/5 hover:text-inv/80"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
