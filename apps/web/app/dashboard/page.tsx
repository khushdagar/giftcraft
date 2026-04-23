import Link from "next/link";
import { auth } from "@/auth";
import { Package, FileText, Clock, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRupees } from "@/lib/utils";

interface KpiProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent: "em" | "gold" | "ink" | "em-400";
}

function Kpi({ label, value, icon: Icon, accent }: KpiProps) {
  const accentMap = {
    em: "bg-em/5 text-em-700 border-em/20",
    gold: "bg-gold/5 text-gold-700 border-gold/20",
    ink: "bg-ink/5 text-ink-700 border-ink/20",
    "em-400": "bg-em/5 text-em-400 border-em/20",
  };

  return (
    <div className={`rounded-gc border-2 p-4 transition ${accentMap[accent]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">
            {label}
          </p>
          <p className="text-2xl font-black">
            {value}
          </p>
        </div>
        <Icon className="h-5 w-5 opacity-40" />
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="max-w-6xl space-y-8">
      <div>
        <p className="overline text-ink-3">Dashboard</p>
        <h1 className="mt-1 text-3xl sm:text-4xl font-black">Welcome back, <span className="italic text-em">{firstName}.</span></h1>
        <p className="mt-1 text-sm text-ink-2">Here&apos;s what&apos;s happening with your gifting.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Active Orders" value="3" icon={Package} accent="em" />
        <Kpi label="Active Quotes" value="2" icon={FileText} accent="gold" />
        <Kpi label="In Production" value="1" icon={Clock} accent="em" />
        <Kpi label="YTD Spend" value={formatRupees(485000)} icon={TrendingUp} accent="em-400" />
      </div>

      {/* Mockup alert */}
      <div className="rounded-gc border-2 border-gold/30 bg-gold-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-white font-bold">!</div>
          <div className="flex-1">
            <p className="font-semibold text-gold-700">Mockups awaiting your review</p>
            <p className="mt-1 text-sm text-ink-2">Order #GC-2026-0138 (Diwali Hamper × 150) has mockups ready. Approve to start production.</p>
          </div>
          <Button asChild variant="outline" size="sm"><Link href="/dashboard/orders">Review now</Link></Button>
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-gc bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-bdr p-5">
          <h2 className="font-display text-lg font-bold">Recent orders</h2>
          <Link href="/dashboard/orders" className="text-xs font-semibold text-em">See all →</Link>
        </div>
        <div className="divide-y divide-bdr">
          {[
            { id: "GC-2026-0142", name: "New Hire Welcome Kit × 50", status: "In Production", variant: "em" as const, amt: 69465 },
            { id: "GC-2026-0138", name: "Diwali Premium Hamper × 150", status: "Mockup Review", variant: "gold" as const, amt: 224850 },
            { id: "GC-2026-0132", name: "Team Sports Pack × 80", status: "Delivered", variant: "grey" as const, amt: 59920 },
          ].map((o) => (
            <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="flex items-center justify-between p-5 transition hover:bg-elevated">
              <div>
                <p className="font-medium text-sm">{o.name}</p>
                <p className="mt-1 text-xs text-ink-3">{o.id}</p>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant={o.variant}>{o.status}</Badge>
                <p className="font-black tabnum text-sm">{formatRupees(o.amt)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
