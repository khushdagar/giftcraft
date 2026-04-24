import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Search, LayoutDashboard, Package, ShoppingBag, Users, Truck, BarChart3, Settings, Tag, Image as ImageIcon, LogOut } from "lucide-react";
import { auth, signOut } from "@/auth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

const NAV = [
  { section: "Overview", items: [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  ]},
  { section: "Commerce", items: [
    { href: "/admin/products", icon: Package, label: "Products" },
    { href: "/admin/orders", icon: ShoppingBag, label: "Orders", badge: "3" },
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
    { href: "/admin/settings", icon: Settings, label: "Settings" },
    { href: "/admin/settings/users", icon: Users, label: "Users & Roles" },
  ]},
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login?from=/admin");
  if (session.user.role !== "super_admin") redirect("/unauthorized");

  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[220px_1fr]">
      {/* Dark sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col overflow-y-auto bg-dark text-inv lg:flex">
        <Link href="/" className="px-[18px] pb-5 pt-4 font-display text-lg italic text-em-400">
          GiftCraft <span className="text-[10px] not-italic text-inv/30">admin</span>
        </Link>

        {NAV.map((section) => (
          <div key={section.section}>
            <p className="px-[18px] pb-1 pt-3 text-[9px] font-bold uppercase tracking-[0.12em] text-inv/20">{section.section}</p>
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="mx-2 mb-0.5 flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-inv/45 transition hover:bg-white/5 hover:text-inv/70"
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && <span className="rounded-md-p bg-err px-1.5 py-0.5 text-[9px] font-bold">{item.badge}</span>}
              </Link>
            ))}
          </div>
        ))}

        <form
          action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}
          className="mt-auto border-t border-white/5 p-3"
        >
          <div className="flex items-center gap-2 px-1">
            <Avatar className="h-7 w-7">
              {session.user.image && <AvatarImage src={session.user.image} />}
              <AvatarFallback>{session.user.name?.[0] ?? "A"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-inv/60">{session.user.name}</p>
              <p className="truncate text-[10px] text-inv/25">{session.user.role}</p>
            </div>
            <button type="submit" className="text-inv/40 hover:text-inv" aria-label="Sign out"><LogOut className="h-3.5 w-3.5" /></button>
          </div>
        </form>
      </aside>

      <div className="flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b border-bdr bg-white px-5">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
            <Input placeholder="Search orders, products, clients..." className="h-8 border-bdr bg-canvas pl-9 text-[13px]" />
          </div>
          <button className="relative flex h-8 w-8 items-center justify-center rounded-md text-ink-2 hover:bg-elevated" aria-label="Notifications, 3 unread">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1 top-1 h-3.5 w-3.5 rounded-full bg-err text-[8px] font-bold leading-[14px] text-white">3</span>
          </button>
        </header>

        <main className="p-5 lg:p-7">{children}</main>
      </div>
    </div>
  );
}
