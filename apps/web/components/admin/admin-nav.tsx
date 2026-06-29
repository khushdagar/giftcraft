'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingBag, Users, Truck, BarChart3, Settings, Tag, AlertCircle, Zap, Box, Gift, Sparkles, Mail, Megaphone } from 'lucide-react';

const NAV = [
  { section: "Overview", items: [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  ]},
  { section: "Commerce", items: [
    { href: "/admin/products", icon: Package, label: "Products" },
    { href: "/admin/orders", icon: ShoppingBag, label: "Orders" },
    { href: "/admin/goc", icon: Sparkles, label: "GOC Campaigns" },
    { href: "/admin/samples", icon: Box, label: "Samples" },
    { href: "/admin/disputes", icon: AlertCircle, label: "Disputes" },
    { href: "/admin/enquiries", icon: Mail, label: "Enquiries" },
    { href: "/admin/clients", icon: Users, label: "Clients" },
    { href: "/admin/vendors", icon: Truck, label: "Vendors" },
  ]},
  { section: "Content", items: [
    { href: "/admin/categories", icon: Tag, label: "Categories" },
    { href: "/admin/occasions", icon: Gift, label: "Occasions" },
  ]},
  { section: "Marketing", items: [
    { href: "/admin/offers", icon: Megaphone, label: "Offers & Emails" },
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
  const [ordersCount, setOrdersCount] = useState(0);

  // Live count of active orders for the Orders badge (polls every 60s).
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/notifications');
        if (!res.ok) return;
        const data = await res.json();
        if (active) setOrdersCount(data.navOrdersCount || 0);
      } catch {
        /* ignore */
      }
    };
    load();
    const interval = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const badgeFor = (href: string): string | null =>
    href === '/admin/orders' && ordersCount > 0 ? String(ordersCount) : null;

  return (
    <>
      {NAV.map((section) => (
        <div key={section.section} className="pt-4">
          <p className="px-5 pb-2 text-xs font-normal uppercase tracking-[0.08em] text-white">{section.section}</p>
          {section.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const badge = badgeFor(item.href);
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
                {badge && (
                  <span className={`rounded-md px-2 py-1 text-xs font-normal leading-none ${
                    active
                      ? 'bg-err text-white'
                      : 'bg-err text-inv'
                  }`}>
                    {badge}
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
