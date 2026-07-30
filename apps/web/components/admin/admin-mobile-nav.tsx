'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Menu, X, LogOut } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AdminNav } from '@/components/admin/admin-nav';
import { BrandLogo } from '@/components/layout/brand-logo';

interface Props {
  userName?: string | null;
  userRole?: string | null;
  userImage?: string | null;
}

/**
 * Mobile-only hamburger + offcanvas drawer for the admin shell. Reuses the
 * same <AdminNav /> as the desktop sidebar. Auto-closes on route change so
 * tapping a link dismisses the drawer, and locks body scroll while open.
 */
export function AdminMobileNav({ userName, userRole, userImage }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close after navigating to a new route.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[900] md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 flex h-full w-[280px] max-w-[85vw] flex-col overflow-y-auto bg-dark text-inv shadow-float">
            <div className="flex items-center justify-between px-5 py-4">
              <Link href="/" className="flex items-center gap-2">
                <BrandLogo className="h-7 w-auto rounded-md" />
                <span className="text-xs font-normal text-inv/40">admin</span>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-inv/60 hover:bg-dark-2 hover:text-inv"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <AdminNav />

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="mt-auto flex items-center gap-3 border-t border-ink/10 px-4 py-4 text-sm font-medium text-inv/70 transition-colors hover:bg-dark-2 hover:text-inv"
            >
              <Avatar className="h-7 w-7">
                {userImage && <AvatarImage src={userImage} />}
                <AvatarFallback className="bg-dark-2 text-inv text-xs">
                  {userName?.[0] ?? 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-xs font-medium text-inv/80">{userName}</p>
                <p className="truncate text-xs text-inv/40">{userRole}</p>
              </div>
              <LogOut className="h-4 w-4 shrink-0" />
            </button>
          </aside>
        </div>
      )}
    </>
  );
}
