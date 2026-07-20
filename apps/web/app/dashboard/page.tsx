import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Package, FileText, Clock, TrendingUp, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRupees } from "@/lib/utils";
import { Decimal } from "@prisma/client/runtime/library";

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
    <div className={`rounded-md border-2 p-4 transition ${accentMap[accent]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-normal uppercase tracking-wider text-ink-3 mb-2">
            {label}
          </p>
          <p className="text-2xl font-normal">
            {value}
          </p>
        </div>
        <Icon className="h-5 w-5 opacity-40" />
      </div>
    </div>
  );
}

function getStatusVariant(status: string): "em" | "gold" | "grey" {
  if (status === "mockup_pending") return "gold";
  if (status === "delivered" || status === "completed") return "grey";
  return "em";
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "Draft",
    quote_sent: "Quote Sent",
    confirmed: "Confirmed",
    mockup_pending: "Mockup Review",
    mockup_approved: "Approved",
    production: "In Production",
    quality_check: "QC",
    packed: "Packed",
    shipped: "Shipped",
    in_transit: "In Transit",
    delivered: "Delivered",
    completed: "Completed",
    cancelled: "Cancelled",
    refunded: "Refunded",
  };
  return labels[status] || status;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return <div>Please log in</div>;
  }

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";
  const userId = session.user.id;

  // Fetch KPI data
  const [activeOrders, activeQuotes, inProductionCount, ytdSpendData] = await Promise.all([
    prisma.order.count({
      where: {
        placedById: userId,
        status: {
          notIn: ["delivered", "completed", "cancelled", "refunded"],
        },
      },
    }),
    prisma.quote.count({
      where: {
        createdById: userId,
        status: "active",
      },
    }),
    prisma.order.count({
      where: {
        placedById: userId,
        status: "production",
      },
    }),
    prisma.order.aggregate({
      where: {
        placedById: userId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), 0, 1),
        },
      },
      _sum: {
        grandTotal: true,
      },
    }),
  ]);

  const ytdSpend = ytdSpendData._sum.grandTotal || new Decimal(0);

  // Fetch recent orders with product details
  const recentOrders = await prisma.order.findMany({
    where: { placedById: userId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      packQuantity: true,
      grandTotal: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          productId: true,
          quantity: true,
          unitPrice: true,
          product: {
            select: {
              name: true,
              images: {
                select: {
                  url: true,
                  isPrimary: true,
                },
                orderBy: { sortOrder: "asc" },
                take: 1,
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  // Fetch mockup pending orders for the alert
  const mockupPendingOrders = await prisma.order.findMany({
    where: {
      placedById: userId,
      status: "mockup_pending",
    },
    select: {
      id: true,
      orderNumber: true,
      packQuantity: true,
    },
    take: 1,
  });

  const mockupAlert = mockupPendingOrders[0];

  return (
    <div className="max-w-full space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="overline text-ink-3">Dashboard</p>
          <h1 className="mt-1 text-3xl sm:text-4xl font-normal">Welcome back, <span className="italic text-em">{firstName}.</span></h1>
          <p className="mt-1 text-sm text-ink-2">Here&apos;s what&apos;s happening with your gifting.</p>
        </div>
        <Button asChild variant="em" className="rounded-2xl">
          <Link href="/builder" className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Order
          </Link>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Active Orders" value={activeOrders} icon={Package} accent="em" />
        <Kpi label="Active Quotes" value={activeQuotes} icon={FileText} accent="gold" />
        <Kpi label="In Production" value={inProductionCount} icon={Clock} accent="em" />
        <Kpi label="YTD Spend" value={formatRupees(Number(ytdSpend))} icon={TrendingUp} accent="em-400" />
      </div>

      {/* Mockup alert */}
      {mockupAlert ? (
        <div className="rounded-md border-2 border-gold/30 bg-gold-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-white font-normal">!</div>
            <div className="flex-1">
              <p className="font-normal text-gold-700">Mockups awaiting your review</p>
              <p className="mt-1 text-sm text-ink-2">Order #{mockupAlert.orderNumber} (Pack × {mockupAlert.packQuantity}) has mockups ready. Approve to start production.</p>
            </div>
            <Button asChild variant="outline" size="sm"><Link href="/dashboard/orders">Review now</Link></Button>
          </div>
        </div>
      ) : null}

      {/* Recent orders */}
      <div className="rounded-md bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-bdr p-5">
          <h2 className="font-display text-lg font-normal">Recent orders</h2>
          <Link href="/dashboard/orders" className="text-xs font-normal text-em">See all →</Link>
        </div>
        <div className="divide-y divide-bdr">
          {recentOrders.length > 0 ? (
            recentOrders.map((o: any) => {
              const items = o.items ?? [];
              const thumbs = items.slice(0, 4);
              const hiddenCount = items.length - thumbs.length;

              return (
                <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="flex items-center gap-4 p-5 transition hover:bg-elevated">
                  {/* Product collage — up to 4 thumbnails, last one counts the rest */}
                  <div className="grid h-16 w-16 flex-shrink-0 grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-lg bg-gray-100">
                    {thumbs.length > 0 ? (
                      thumbs.map((it: any, i: number) => {
                        const url = it.product?.images?.[0]?.url;
                        const showOverflow = hiddenCount > 0 && i === thumbs.length - 1;
                        const spanClass =
                          thumbs.length === 1 ? 'col-span-2 row-span-2' : thumbs.length === 3 && i === 0 ? 'row-span-2' : '';
                        return (
                          <div key={it.id} className={`relative bg-gray-100 ${spanClass}`}>
                            {url ? (
                              <img src={url} alt={it.product?.name ?? ''} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[8px] text-gray-400">—</div>
                            )}
                            {showOverflow && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-[10px] font-medium text-white">
                                +{hiddenCount + 1}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-2 row-span-2 flex items-center justify-center text-xs text-gray-400">No image</div>
                    )}
                  </div>

                  {/* Order Details */}
                  <div className="flex-1 min-w-0">
                    <ul className="space-y-0.5">
                      {items.map((it: any) => (
                        <li key={it.id} className="flex items-baseline gap-2 text-xs text-ink-3">
                          <span className="truncate">{it.product?.name ?? 'Product'}</span>
                          <span className="flex-shrink-0 tabnum">×{it.quantity}</span>
                          <span className="flex-shrink-0 tabnum">({formatRupees(Number(it.unitPrice))})</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-0.5 text-xs text-ink-3">Pack × {o.packQuantity} · #{o.orderNumber}</p>
                  </div>

                  {/* Status and Price */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <Badge variant={getStatusVariant(o.status)}>{getStatusLabel(o.status)}</Badge>
                    <p className="font-normal tabnum text-sm whitespace-nowrap">{formatRupees(Number(o.grandTotal))}</p>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="p-5 text-center text-sm text-ink-3">
              No orders yet. <Link href="/builder" className="text-em font-normal">Start building →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
