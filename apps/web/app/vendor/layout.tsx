import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import Link from 'next/link';
import { signOut } from '@/auth';
import { Package, DollarSign, User, LogOut } from 'lucide-react';

export const metadata = {
  title: 'Vendor Portal - GiftCraft',
  description: 'Manage purchase orders and payments',
};

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
      {/* Sidebar */}
      <div className="w-64 bg-white border-r-2 border-bdr flex flex-col">
        {/* Logo */}
        <Link href="/vendor/dashboard" className="px-6 py-6 border-b-2 border-bdr">
          <p className="text-lg font-black text-ink">GiftCraft</p>
          <p className="text-xs text-ink-3">Vendor Portal</p>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-md text-sm font-semibold text-ink-2 hover:bg-gray-100 hover:text-ink transition"
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
            <p className="text-sm font-semibold text-ink truncate">{session.user.name}</p>
          </div>

          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md border-2 border-bdr text-ink-2 hover:bg-gray-50 hover:text-ink font-semibold text-sm transition"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <div className="max-w-5xl mx-auto p-8">{children}</div>
      </div>
    </div>
  );
}
