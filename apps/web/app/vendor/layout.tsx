import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import Link from 'next/link';
import { signOut } from '@/auth';
import { Package, DollarSign, User, LogOut } from 'lucide-react';
import { VendorMobileNav } from '@/components/vendor/vendor-mobile-nav';
import { BrandLogo } from '@/components/layout/brand-logo';

export const metadata = {
  title: 'Vendor Portal - GIVOO',
  description: 'Manage purchase orders and payments',
};

// SECURITY: vendor pages render POs, payments and profile data scoped to the
// signed-in vendor. Force per-request dynamic rendering so no vendor's page is
// statically cached and served to another vendor.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== 'vendor') {
    redirect('/unauthorized');
  }

  const navItems = [
    { href: '/vendor/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/vendor/po', label: 'Purchase Orders', icon: Package },
    { href: '/vendor/payments', label: 'Payments', icon: DollarSign },
    { href: '/vendor/profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar — desktop only */}
      <div className="hidden w-64 shrink-0 bg-white border-r-2 border-bdr lg:flex flex-col">
        {/* Logo */}
        <Link href="/vendor/dashboard" className="px-6 py-6 border-b-2 border-bdr">
          <BrandLogo className="h-9 w-auto" />
          <p className="mt-1 text-xs text-ink-3">Vendor Portal</p>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-md text-sm font-normal text-ink-2 hover:bg-gray-100 hover:text-ink transition"
            >
              {typeof item.icon === 'string' ? (
                <span>{item.icon}</span>
              ) : (
                <item.icon className="w-5 h-5" />
              )}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="px-4 py-4 border-t-2 border-bdr space-y-3">
          <div className="px-4 py-3 rounded-md bg-gray-50">
            <p className="text-xs text-ink-3">Logged in as</p>
            <p className="text-sm font-normal text-ink truncate">{session.user.name}</p>
          </div>

          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md border-2 border-bdr text-ink-2 hover:bg-gray-50 hover:text-ink font-normal text-sm transition"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <VendorMobileNav userName={session.user.name} />
        <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
