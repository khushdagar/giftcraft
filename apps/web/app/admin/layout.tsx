import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, LogOut } from "lucide-react";
import { auth, signOut } from "@/auth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { NotificationBell } from "@/components/admin/notification-bell";
import { BrandLogo } from "@/components/layout/brand-logo";

// Admin pages are session-gated and render live operational data. Force
// per-request dynamic rendering so nothing under /admin is statically cached.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login?from=/admin");
  if (session.user.role !== "super_admin") redirect("/unauthorized");

  return (
    <div className="grid min-h-screen bg-white md:grid-cols-[256px_1fr]">
      {/* Dark sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col overflow-y-auto border-r border-ink/10 bg-dark text-inv md:flex">
        <Link href="/" className="flex items-center gap-2 px-5 py-4">
          <BrandLogo className="h-10 w-auto" />
          <span className="text-xs font-normal text-inv/40">admin</span>
        </Link>

        <AdminNav />

        <form
          action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}
          className="mt-auto border-t border-ink/10 p-4"
        >
          <button type="submit" className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-sm font-medium text-inv/70 transition-colors hover:bg-dark-2 hover:text-inv">
            <Avatar className="h-7 w-7">
              {session.user.image && <AvatarImage src={session.user.image} />}
              <AvatarFallback className="bg-dark-2 text-inv text-xs">{session.user.name?.[0] ?? "A"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-xs font-medium text-inv/80">{session.user.name}</p>
              <p className="truncate text-xs text-inv/40">{session.user.role}</p>
            </div>
            <LogOut className="h-4 w-4 shrink-0" />
          </button>
        </form>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-gray-200 bg-white px-4 sm:px-6">
          <AdminMobileNav
            userName={session.user.name}
            userRole={session.user.role}
            userImage={session.user.image}
          />
          <div className="relative max-w-lg flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search..." className="h-9 border-gray-200 bg-gray-50 pl-10 text-sm text-gray-700 placeholder:text-gray-500 focus:bg-white" />
          </div>
          <NotificationBell />
        </header>

        <main className="min-h-[calc(100vh-64px)] bg-gray-50 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
