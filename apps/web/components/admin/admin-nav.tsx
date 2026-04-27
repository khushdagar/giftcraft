'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingBag, Users, Truck, BarChart3, Settings, Tag, Image as ImageIcon, AlertCircle, Zap } from 'lucide-react';

const NAV = [
  { section: "Overview", items: [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  ]},
  { section: "Commerce", items: [
    { href: "/admin/products", icon: Package, label: "Products" },
    { href: "/admin/orders", icon: ShoppingBag, label: "Orders", badge: "3" },
    { href: "/admin/disputes", icon: AlertCircle, label: "Disputes" },
    { href: "/admin/clients", icon: Users, label: "Clients" },
    { href: "/admin/vendors", icon: Truck, label: "Vendors" },
  ]},
  { section: "Content", items: [
    { href: "/admin/categories", icon: Tag, label: "Categories" },
    { href: "/admin/collections", icon: ImageIcon, label: "Collections" },
  ]},
  { section: "Insight", items: [
    { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  ]},
  { section: "System", items: [
    { href: "/admin/automations", icon: Zap, label: "Automations" },
    { href: "/admin/settings", icon: Settings, label: "Settings" },
    { href: "/admin/settings/users", icon: Users, label: "Users & Roles" },
  ]},
];

export function AdminNav() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {NAV.map((section) => (
        <div key={section.section} className="pt-4">
          <p className="px-5 pb-2 text-xs font-semibold uppercase tracking-[0.08em] text-white">{section.section}</p>
          {section.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mx-2 mb-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-surface text-ink'
                    : 'text-white hover:bg-dark-2 hover:text-inv'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className={`rounded-md px-2 py-1 text-xs font-bold leading-none ${
                    active
                      ? 'bg-err text-white'
                      : 'bg-err text-inv'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}
