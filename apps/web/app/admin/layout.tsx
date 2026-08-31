import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Toaster } from "sonner";
import { auth, signOut } from "@/auth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { NotificationBell } from "@/components/admin/notification-bell";
import { GlobalSearch } from "@/components/admin/global-search";
import Image from "next/image";

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
          <Image src="/footer_logo.png" alt="GIVOO Logo" width={160} height={40} className="mb-2.5 h-10 w-auto" />
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
          <GlobalSearch />
          <NotificationBell />
        </header>

        <main className="min-h-[calc(100vh-64px)] bg-gray-50 p-4">{children}</main>
      </div>

      {/* Every admin form calls sonner's toast.success()/toast.error() on
          save — nothing rendered it before, so those calls were silent. */}
      <Toaster richColors position="top-right" />
    </div>
  );
}
