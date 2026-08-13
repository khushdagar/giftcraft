import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { orderScopeWhere } from "@/lib/order-access";
import { Package, FileText, Clock, TrendingUp, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRupees } from "@/lib/utils";
import { DashboardPaymentModal } from "./components/payment-modal";
import { OccasionReminderBanner } from "@/components/dashboard/occasion-reminder-banner";

interface KpiProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent: "em" | "gold" | "ink" | "em-400";
}

function Kpi({ label, value, icon: Icon, accent }: KpiProps) {
  const accentMap = {
    em: "bg-white text-em-700 border-em/20",
    gold: "bg-white text-gold-700 border-gold/20",
    ink: "bg-white text-ink-700 border-ink/20",
    "em-400": "bg-white text-em-400 border-em/20",
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

  // Orders are scoped to the buyer's company, not just this login, so a buyer
  // who checked out under a second email still sees their whole history.
  const orderScope = orderScopeWhere(session.user);

  // Fetch KPI data
  const [activeOrders, activeQuotes, inProductionCount, ytdSpendData] = await Promise.all([
    prisma.order.count({
      where: {
        ...orderScope,
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
        ...orderScope,
        status: "production",
      },
    }),
    prisma.order.findMany({
      where: {
        ...orderScope,
        // Only orders actually paid for — not merely placed
        paidAt: {
          gte: new Date(new Date().getFullYear(), 0, 1),
        },
        status: { not: "refunded" },
      },
      // amountPaid lives in billingJson, so it can't be aggregated in SQL
      select: { billingJson: true },
    }),
  ]);

  // Sum what the customer actually paid (advance or full), not order totals.
  const ytdSpend = ytdSpendData.reduce(
    (sum, o) => sum + Number((o.billingJson as any)?.amountPaid ?? 0),
    0
  );

  // Saved packs feed the occasion banner's "reorder a saved pack" shortcut.
  const savedPackCount = await prisma.savedPack.count({ where: { userId } });

  // Fetch recent orders with product details
  const recentOrders = await prisma.order.findMany({
    where: orderScope,
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

  // Every order currently awaiting the customer's mockup review — not just the
  // first. When several orders have mockups ready at once, each must surface here
  // with its own order number and Review link, or the later ones get stranded.
  const mockupPendingOrders = await prisma.order.findMany({
    where: {
      ...orderScope,
      status: "mockup_pending",
    },
    select: {
      id: true,
      orderNumber: true,
      packQuantity: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // The single-order layout below reads element [0]. A `.length === 1` check
  // does not narrow an index access for the compiler, so bind it once here and
  // let the JSX branch on the value itself.
  const [onlyMockupOrder] = mockupPendingOrders;

  return (
    <div className="max-w-full space-y-8">
      {/* Balance-payment popup — opens when redirected here with ?pay=<orderId>
          right after a mockup is approved. */}
      <Suspense fallback={null}>
        <DashboardPaymentModal />
      </Suspense>

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

      {/* Upcoming occasion reminder — renders only when one is within 75 days */}
      <OccasionReminderBanner savedPackCount={savedPackCount} />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Active Orders" value={activeOrders} icon={Package} accent="em" />
        {/* <Kpi label="Active Quotes" value={activeQuotes} icon={FileText} accent="gold" /> */}
        <Kpi label="In Production" value={inProductionCount} icon={Clock} accent="em" />
        <Kpi label="YTD Spend" value={formatRupees(Number(ytdSpend))} icon={TrendingUp} accent="em-400" />
      </div>

      {/* Mockup alert — lists EVERY order awaiting review, each with its own
          order number and a Review link to that specific order. */}
      {mockupPendingOrders.length > 0 ? (
        <div className="rounded-md border-2 border-gold/30 bg-gold-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-white font-normal">!</div>
            <div className="flex-1 min-w-0">
              <p className="font-normal text-gold-700">
                Mockups awaiting your review
                {mockupPendingOrders.length > 1 ? ` (${mockupPendingOrders.length})` : ""}
              </p>

              {mockupPendingOrders.length === 1 && onlyMockupOrder ? (
                <p className="mt-1 text-sm text-ink-2">
                  Order #{onlyMockupOrder.orderNumber} (Pack × {onlyMockupOrder.packQuantity}) has mockups ready. Approve to start production.
                </p>
              ) : (
                <>
                  <p className="mt-1 text-sm text-ink-2">
                    {mockupPendingOrders.length} orders have mockups ready. Approve each to start production.
                  </p>
                  <ul className="mt-3 space-y-2">
                    {mockupPendingOrders.map((o) => (
                      <li
                        key={o.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-gold/20 bg-white/60 px-3 py-2"
                      >
                        <span className="min-w-0 truncate text-sm text-ink-2">
                          Order #{o.orderNumber}
                          <span className="text-ink-3"> · Pack × {o.packQuantity}</span>
                        </span>
                        <Button asChild variant="outline" size="sm" className="flex-shrink-0">
                          <Link href={`/dashboard/orders/${o.id}`}>Review</Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* Single-order shortcut keeps the original one-click layout. */}
            {mockupPendingOrders.length === 1 && onlyMockupOrder && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/orders/${onlyMockupOrder.id}`}>Review now</Link>
              </Button>
            )}
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
                <Link
                  key={o.id}
                  href={`/dashboard/orders/${o.id}`}
                  className="flex flex-col gap-3 p-4 transition hover:bg-elevated sm:flex-row sm:items-center sm:gap-4 sm:p-5"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
                  {/* Product collage — up to 4 thumbnails, last one counts the rest */}
                  <div className="grid h-16 w-16 flex-shrink-0 grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-md bg-gray-100">
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

                  {/* Order Details — names get the full row width so they read in
                      full on a phone instead of truncating after a few characters. */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-ink-3">#{o.orderNumber} · Pack × {o.packQuantity}</p>
                    <ul className="mt-1 space-y-0.5">
                      {items.slice(0, 3).map((it: any) => (
                        <li key={it.id} className="flex items-baseline justify-between gap-2 text-[13px]">
                          <span className="truncate text-ink-2">{it.product?.name ?? 'Product'}</span>
                          <span className="flex-shrink-0 tabnum text-ink-3">× {it.quantity}</span>
                        </li>
                      ))}
                      {items.length > 3 && (
                        <li className="text-[11px] text-ink-3">+{items.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                  </div>

                  {/* Status and Price — full-width row under the details on mobile,
                      right-aligned column beside them from sm up. */}
                  <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-bdr pt-3 sm:flex-col sm:items-end sm:gap-2 sm:border-0 sm:pt-0">
                    <Badge variant={getStatusVariant(o.status)}>{getStatusLabel(o.status)}</Badge>
                    <p className="whitespace-nowrap text-sm font-normal tabnum">{formatRupees(Number(o.grandTotal))}</p>
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
