import Link from "next/link";
import { auth } from "@/auth";
import { Package, FileText, Clock, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRupees } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="max-w-6xl space-y-8">
      <div>
        <p className="overline text-ink-3">Dashboard</p>
        <h1 className="mt-1 t-heading">Welcome back, <span className="italic-em">{firstName}.</span></h1>
        <p className="mt-1 text-sm text-ink-2">Here&apos;s what&apos;s happening with your gifting.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Active Orders" value="3" icon={Package} accent="em" />
        <Kpi label="Active Quotes" value="2" icon={FileText} accent="gold" />
        <Kpi label="In Production" value="1" icon={Clock} accent="em" />
        <Kpi label="YTD Spend" value={formatRupees(485000)} icon={TrendingUp} accent="em" />
      </div>

      {/* Mockup alert */}
      <div className="rounded-gc border-2 border-gold/30 bg-gold-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-white">!</div>
          <div className="flex-1">
            <p className="font-semibold text-gold-700">Mockups awaiting your review</p>
            <p className="mt-1 text-sm text-ink-2">Order #GC-2026-0138 (Diwali Hamper × 150) has mockups ready. Approve to start production.</p>
          </div>
          <Button asChild variant="gold" size="sm"><Link href="/dashboard/orders/GC-2026-0138">Review now</Link></Button>
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-gc bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-bdr p-5">
          <h2 className="font-display text-lg">Recent orders</h2>
          <Link href="/dashboard/orders" className="text-xs font-semibold text-em">See all →</Link>
        </div>
        <div className="divide-y divide-bdr">
          {[
            { id: "GC-2026-0142", name: "New Hire Welcome Kit × 50", status: "In Production", variant: "em" as const, amt: 69465 },
            { id: "GC-2026-0138", name: "Diwali Premium Hamper × 150", status: "Mockup Review", variant: "gold" as const, amt: 224850 },
            { id: "GC-2026-0132", name: "Team Sports Pack × 80", status: "Delivered", variant: "grey" as const, amt: 59920 },
          ].map((o) => (
            <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="flex items-center gap-4 p-4 transition hover:bg-elevated">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-em-50 text-lg">🎁</div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{o.name}</p>
                <p className="text-xs text-ink-3 tabnum">{o.id}</p>
              </div>
              <Badge variant={o.variant}>{o.status}</Badge>
              <p className="hidden text-sm font-semibold sm:block tabnum">{formatRupees(o.amt)}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <QuickAction href="/builder" title="Build a new pack" desc="Start a gift from scratch in 4 steps." emoji="🎁" />
        <QuickAction href="/catalog" title="Browse products" desc="500+ SKUs with instant pricing." emoji="🛍️" />
        <QuickAction href="/dashboard/assets" title="Manage brand assets" desc="Upload logos, share with designers." emoji="🖼️" />
      </div>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, accent }: { label: string; value: string; icon: React.ElementType; accent: "em" | "gold" }) {
  return (
    <div className="rounded-gc bg-white p-5 shadow-card">
      <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-full ${accent === "em" ? "bg-em-50 text-em" : "bg-gold-50 text-gold"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="font-display text-2xl font-semibold tabnum">{value}</p>
      <p className="text-xs font-medium text-ink-3">{label}</p>
    </div>
  );
}

function QuickAction({ href, title, desc, emoji }: { href: string; title: string; desc: string; emoji: string }) {
  return (
    <Link href={href} className="group rounded-gc bg-white p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-hover">
      <div className="mb-3 text-3xl">{emoji}</div>
      <p className="font-display text-lg">{title}</p>
      <p className="mt-1 text-xs text-ink-2">{desc}</p>
      <span className="mt-3 inline-block text-xs font-semibold text-em">Get started →</span>
    </Link>
  );
}
