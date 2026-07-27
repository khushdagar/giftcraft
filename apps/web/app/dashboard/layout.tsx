import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, Package, FileText, FolderOpen, Building2, Settings, LogOut, Bell, MapPin } from "lucide-react";
import { auth, signOut } from "@/auth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DashboardMobileNav } from "@/components/dashboard/dashboard-mobile-nav";

// SECURITY: every page under /dashboard renders data scoped to the signed-in
// user (orders, quotes, addresses, company, assets). Force per-request dynamic
// rendering for the whole subtree so Next.js never statically caches a rendered
// page and serves one customer's private data to the next visitor.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/orders", icon: Package, label: "Orders" },
  // { href: "/dashboard/quotes", icon: FileText, label: "Quotes" },
  { href: "/dashboard/assets", icon: FolderOpen, label: "Brand Assets" },
  { href: "/dashboard/addresses", icon: MapPin, label: "Saved Addresses" },
  { href: "/dashboard/company", icon: Building2, label: "Company" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
  // { href: "/dashboard/settings/notifications", icon: Bell, label: "Notifications" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login?from=/dashboard");

  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col bg-dark text-inv lg:flex">
        <div className="px-5 pt-5 pb-4">
          <Link href="/" className="font-display text-xl italic text-em-400">GIVOO</Link>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-white">Customer Portal</p>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-2 text-[13px]">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-white transition hover:bg-white/5 hover:text-inv/80"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }} className="border-t border-white/5 p-3">
          <div className="mb-2 flex items-center gap-2 px-2">
            <Avatar className="h-7 w-7">
              {session.user.image && <AvatarImage src={session.user.image} />}
              <AvatarFallback>{session.user.name?.[0] ?? "U"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-inv/70">{session.user.name}</p>
              <p className="truncate text-[10px] text-inv/30">{session.user.role}</p>
            </div>
          </div>
          <button type="submit" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-inv/50 hover:bg-white/5 hover:text-inv/80">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </form>
      </aside>
      <div className="flex min-w-0 flex-col">
        <DashboardMobileNav
          userName={session.user.name}
          userRole={session.user.role}
          userImage={session.user.image}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
