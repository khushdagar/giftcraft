import { formatRupees } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ShoppingBag, Users, FileText, Package, Clock } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="max-w-[1200px] space-y-4">
      <div>
        <h1 className="text-[22px] font-semibold font-display">Dashboard</h1>
        <p className="text-[13px] text-ink-3">Today is the 21st. Here&apos;s how things are moving.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <MiniKpi label="Revenue MTD" value={formatRupees(2840000)} change="+18.4%" positive />
        <MiniKpi label="Orders MTD" value="42" change="+7" positive />
        <MiniKpi label="Avg Order Value" value={formatRupees(67619)} change="+4.2%" positive />
        <MiniKpi label="Active Quotes" value="28" change="3 expiring" />
        <MiniKpi label="Clients" value="56" change="+4 this mo" positive />
        <MiniKpi label="Mockups Pending" value="5" change="2 overdue" negative />
      </div>

      {/* Pipeline kanban */}
      <div className="rounded-md bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Order pipeline</h2>
          <p className="text-xs text-ink-3">42 active · 12 today</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          {[
            { name: "Draft/Quote", count: 8, icon: FileText, color: "text-ink-2" },
            { name: "Mockup", count: 5, icon: FileText, color: "text-gold" },
            { name: "Production", count: 12, icon: Package, color: "text-em" },
            { name: "QC & Pack", count: 4, icon: Clock, color: "text-em" },
            { name: "Shipping", count: 9, icon: ShoppingBag, color: "text-em" },
            { name: "Delivered", count: 4, icon: TrendingUp, color: "text-ink-3" },
          ].map((c) => (
            <div key={c.name} className="rounded-md border border-bdr bg-canvas p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-3">
                <c.icon className={`h-3 w-3 ${c.color}`} />
                {c.name}
              </div>
              <p className="font-display text-2xl font-semibold tabnum">{c.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue chart placeholder */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-md bg-white p-5 shadow-card">
          <h2 className="mb-3 text-[15px] font-semibold">Revenue · last 30 days</h2>
          <div className="relative h-44 overflow-hidden rounded-md bg-gradient-to-b from-em-50 to-transparent">
            <svg viewBox="0 0 400 120" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
              <path
                d="M0,100 C40,80 80,90 120,60 S200,40 240,50 320,30 400,20 L400,120 L0,120 Z"
                fill="rgba(26,107,79,0.15)" stroke="#1A6B4F" strokeWidth="2"
              />
            </svg>
          </div>
        </div>
        <div className="rounded-md bg-white p-5 shadow-card">
          <h2 className="mb-3 text-[15px] font-semibold">Top products</h2>
          <div className="space-y-2.5">
            {[
              ["Flask 500ml", 125000, 42],
              ["Welcome Kit", 98500, 28],
              ["Diwali Hamper", 87400, 12],
              ["Pen Set", 54200, 35],
            ].map(([name, rev, orders]) => (
              <div key={name as string} className="flex items-center justify-between text-[13px]">
                <span className="font-medium">{name as string}</span>
                <div className="text-right">
                  <p className="tabnum font-semibold">{formatRupees(rev as number)}</p>
                  <p className="text-[10px] text-ink-3">{orders as number} orders</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-md bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-bdr px-4 py-3">
          <h2 className="text-[14px] font-semibold">Recent activity</h2>
          <a href="/admin/orders" className="text-[11px] font-semibold text-em">See all</a>
        </div>
        <div className="divide-y divide-bdr">
          {[
            { t: "Order GC-2026-0142 placed", sub: "TechCorp · Welcome Kit × 50 · ₹69,465", badge: "New", v: "em" as const },
            { t: "Mockup uploaded for GC-2026-0138", sub: "Diwali Hamper × 150 · Awaiting client review", badge: "Mockup", v: "gold" as const },
            { t: "Vendor POSent to Arts Shala Prints", sub: "Flask × 150 · Production Stage", badge: "Production", v: "em" as const },
          ].map((a, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 text-[13px]">
              <div className="h-1.5 w-1.5 rounded-full bg-em"></div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{a.t}</p>
                <p className="truncate text-[11px] text-ink-3">{a.sub}</p>
              </div>
              <Badge variant={a.v}>{a.badge}</Badge>
              <p className="text-[11px] text-ink-3">2m ago</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniKpi({ label, value, change, positive, negative }: {
  label: string; value: string; change?: string; positive?: boolean; negative?: boolean;
}) {
  return (
    <div className="rounded-md bg-white p-3 shadow-card">
      <p className="text-[10px] font-medium text-ink-3 uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-[22px] font-semibold font-display tabnum">{value}</p>
      {change && (
        <p className={`mt-0.5 text-[11px] font-medium ${positive ? "text-suc" : negative ? "text-err" : "text-ink-3"}`}>
          {change}
        </p>
      )}
    </div>
  );
}
