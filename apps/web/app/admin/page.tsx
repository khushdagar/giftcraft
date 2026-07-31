import { prisma } from "@/lib/prisma";
import { formatRupees } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ShoppingBag, Users, FileText, Package, Clock } from "lucide-react";
import { SlaAlertWidget } from "@/components/admin/dashboard/sla-alert-widget";
import { NeedsAttentionWidget } from "@/components/admin/dashboard/needs-attention-widget";

// Orders that represent real (non-cancelled, placed) business — used for
// revenue and order metrics. Excludes draft/quote_sent/cancelled/refunded.
const REVENUE_STATUSES = [
  "confirmed", "mockup_pending", "mockup_approved", "production",
  "quality_check", "packed", "shipped", "in_transit", "delivered", "completed",
] as const;

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0] || '');
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Build an SVG area path (viewBox 400×120) from a series of daily values.
function buildAreaPath(values: number[], w = 400, h = 120): string {
  if (values.length < 2) return `M0,${h} L${w},${h} Z`;
  const max = Math.max(...values, 1);
  const n = values.length;
  const pts = values.map((v, i) => {
    const x = (i / (n - 1)) * w;
    const y = h - (v / max) * (h * 0.85) - 4;
    return [Math.round(x * 100) / 100, Math.round(y * 100) / 100] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  return `${line} L${w},${h} L0,${h} Z`;
}

const STATUS_BADGE: Record<string, "em" | "gold" | "grey"> = {
  confirmed: "em",
  mockup_pending: "gold",
  mockup_approved: "gold",
  delivered: "grey",
  completed: "grey",
  cancelled: "grey",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", quote_sent: "Quote", confirmed: "New", mockup_pending: "Mockup",
  mockup_approved: "Approved", production: "Production", quality_check: "QC",
  packed: "Packed", shipped: "Shipped", in_transit: "Transit", delivered: "Delivered",
  completed: "Completed", cancelled: "Cancelled", refunded: "Refunded",
};

export default async function AdminDashboard() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    revMtdAgg, revLastAgg, ordersMtd, ordersLast,
    activeQuotes, clients, mockupsPending,
    pipelineGroups, activeOrders, ordersToday,
    topItems, recentOrders, chartOrders,
  ] = await Promise.all([
    prisma.order.aggregate({ _sum: { grandTotal: true }, where: { status: { in: REVENUE_STATUSES as any }, createdAt: { gte: monthStart } } }),
    prisma.order.aggregate({ _sum: { grandTotal: true }, where: { status: { in: REVENUE_STATUSES as any }, createdAt: { gte: lastMonthStart, lt: monthStart } } }),
    prisma.order.count({ where: { status: { in: REVENUE_STATUSES as any }, createdAt: { gte: monthStart } } }),
    prisma.order.count({ where: { status: { in: REVENUE_STATUSES as any }, createdAt: { gte: lastMonthStart, lt: monthStart } } }),
    prisma.quote.count({ where: { status: "active", expiresAt: { gt: now } } }),
    prisma.company.count(),
    prisma.order.count({ where: { status: "mockup_pending" } }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
    prisma.order.count({ where: { status: { notIn: ["delivered", "completed", "cancelled", "refunded"] } } }),
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.orderItem.groupBy({ by: ["productId"], _sum: { totalPrice: true }, _count: true, orderBy: { _sum: { totalPrice: "desc" } }, take: 4 }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, orderNumber: true, status: true, packQuantity: true, grandTotal: true, createdAt: true, billingJson: true } }),
    prisma.order.findMany({ where: { status: { in: REVENUE_STATUSES as any }, createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true, grandTotal: true } }),
  ]);

  const revenueMtd = Number(revMtdAgg._sum.grandTotal ?? 0);
  const revenueLast = Number(revLastAgg._sum.grandTotal ?? 0);
  const aov = ordersMtd > 0 ? Math.round(revenueMtd / ordersMtd) : 0;
  const pct = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0);
  const revChange = pct(revenueMtd, revenueLast);
  const orderDelta = ordersMtd - ordersLast;

  // Pipeline buckets
  const byStatus: Record<string, number> = {};
  pipelineGroups.forEach((g) => { byStatus[g.status] = g._count; });
  const bucket = (...ss: string[]) => ss.reduce((s, k) => s + (byStatus[k] || 0), 0);
  const pipeline = [
    { name: "Draft/Quote", count: bucket("draft", "quote_sent"), icon: FileText, color: "text-ink-2" },
    { name: "Mockup", count: bucket("mockup_pending", "mockup_approved"), icon: FileText, color: "text-gold" },
    { name: "Production", count: bucket("production"), icon: Package, color: "text-em" },
    { name: "QC & Pack", count: bucket("quality_check", "packed"), icon: Clock, color: "text-em" },
    { name: "Shipping", count: bucket("shipped", "in_transit"), icon: ShoppingBag, color: "text-em" },
    { name: "Delivered", count: bucket("delivered", "completed"), icon: TrendingUp, color: "text-ink-3" },
  ];

  // Top products by revenue
  const products = await prisma.product.findMany({
    where: { id: { in: topItems.map((t) => t.productId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(products.map((p) => [p.id, p.name]));
  const topProducts = topItems.map((t) => ({
    name: nameById.get(t.productId) || "Product",
    revenue: Number(t._sum.totalPrice ?? 0),
    orders: t._count,
  }));

  // 30-day revenue sparkline
  const dailyBuckets = new Array(30).fill(0);
  chartOrders.forEach((o) => {
    const dayIdx = Math.floor((o.createdAt.getTime() - thirtyDaysAgo.getTime()) / (24 * 60 * 60 * 1000));
    if (dayIdx >= 0 && dayIdx < 30) dailyBuckets[dayIdx] += Number(o.grandTotal);
  });
  const areaPath = buildAreaPath(dailyBuckets);

  const recent = recentOrders.map((o) => {
    const b = o.billingJson as any;
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      company: b?.companyName || b?.name || "Customer",
      qty: o.packQuantity,
      total: Number(o.grandTotal),
      status: o.status,
      createdAt: o.createdAt,
    };
  });

  return (
    <div className="max-w-[1200px] space-y-4">
      <div>
        <h1 className="text-[22px] font-normal font-display">Dashboard</h1>
        <p className="text-[13px] text-ink-3">
          Today is the {ordinal(now.getDate())}. Here&apos;s how things are moving.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <MiniKpi label="Revenue MTD" value={formatRupees(revenueMtd)} change={`${revChange >= 0 ? "+" : ""}${revChange}%`} positive={revChange >= 0} negative={revChange < 0} />
        <MiniKpi label="Orders MTD" value={String(ordersMtd)} change={`${orderDelta >= 0 ? "+" : ""}${orderDelta}`} positive={orderDelta >= 0} negative={orderDelta < 0} />
        <MiniKpi label="Avg Order Value" value={formatRupees(aov)} change="this month" />
        <MiniKpi label="Active Quotes" value={String(activeQuotes)} change="not expired" />
        <MiniKpi label="Clients" value={String(clients)} />
        <MiniKpi label="Mockups Pending" value={String(mockupsPending)} change={mockupsPending > 0 ? "awaiting approval" : "all clear"} negative={mockupsPending > 0} />
      </div>

      {/* SLA Alert Widget */}
      <SlaAlertWidget />

      {/* Everything from the customer side that still needs action */}
      <NeedsAttentionWidget />

      {/* Pipeline kanban */}
      <div className="rounded-md bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-normal">Order pipeline</h2>
          <p className="text-xs text-ink-3">{activeOrders} active · {ordersToday} today</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          {pipeline.map((c) => (
            <div key={c.name} className="rounded-md border border-bdr bg-canvas p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-normal uppercase tracking-wider text-ink-3">
                <c.icon className={`h-3 w-3 ${c.color}`} />
                {c.name}
              </div>
              <p className="font-display text-2xl font-normal tabnum">{c.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue chart + top products */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-md bg-white p-5 shadow-card">
          <h2 className="mb-3 text-[15px] font-normal">Revenue · last 30 days</h2>
          <div className="relative h-44 overflow-hidden rounded-md bg-gradient-to-b from-em-50 to-transparent">
            <svg viewBox="0 0 400 120" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
              <path d={areaPath} fill="rgba(128, 0, 32,0.15)" stroke="#800020" strokeWidth="2" />
            </svg>
          </div>
        </div>
        <div className="rounded-md bg-white p-5 shadow-card">
          <h2 className="mb-3 text-[15px] font-normal">Top products</h2>
          <div className="space-y-2.5">
            {topProducts.length === 0 ? (
              <p className="text-[13px] text-ink-3">No sales yet.</p>
            ) : (
              topProducts.map((p) => (
                <div key={p.name} className="flex items-center justify-between text-[13px]">
                  <span className="font-medium">{p.name}</span>
                  <div className="text-right">
                    <p className="tabnum font-normal">{formatRupees(p.revenue)}</p>
                    <p className="text-[10px] text-ink-3">{p.orders} orders</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-md bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-bdr px-4 py-3">
          <h2 className="text-[14px] font-normal">Recent activity</h2>
          <a href="/admin/orders" className="text-[11px] font-normal text-em">See all</a>
        </div>
        <div className="divide-y divide-bdr">
          {recent.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-ink-3">No orders yet.</p>
          ) : (
            recent.map((a) => (
              <a key={a.id} href={`/admin/orders/${a.id}`} className="flex items-center gap-3 px-4 py-3 text-[13px] transition hover:bg-canvas">
                <div className="h-1.5 w-1.5 rounded-full bg-em"></div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">Order {a.orderNumber} placed</p>
                  <p className="truncate text-[11px] text-ink-3">{a.company} · {a.qty} packs · {formatRupees(a.total)}</p>
                </div>
                <Badge variant={STATUS_BADGE[a.status] || "em"}>{STATUS_LABEL[a.status] || a.status}</Badge>
                <p className="whitespace-nowrap text-[11px] text-ink-3">{relativeTime(a.createdAt)}</p>
              </a>
            ))
          )}
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
      <p className="mt-1 text-[22px] font-normal font-display tabnum">{value}</p>
      {change && (
        <p className={`mt-0.5 text-[11px] font-medium ${positive ? "text-suc" : negative ? "text-err" : "text-ink-3"}`}>
          {change}
        </p>
      )}
    </div>
  );
}
