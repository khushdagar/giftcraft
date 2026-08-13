import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ExternalLink, MapPin, Truck } from "lucide-react";

// Public tracking page — reachable by anyone with the link (order ids are
// unguessable cuids, same model as the quote/proposal share pages). Deliberately
// shows NO money, addresses or contact details: just order number, contents
// summary, progress and courier info.
export const metadata: Metadata = {
  title: "Track Order",
  robots: { index: false, follow: false },
};

// Each visible step maps to one or more actual OrderStatus values so the
// progress bar tracks the real order state (incl. the mockup-approval stages).
const STATUS_STEPS = [
  {
    keys: ["confirmed", "mockup_pending", "mockup_approved", "payment_pending"],
    label: "Confirmed",
    description: "Order received",
  },
  {
    keys: ["production"],
    label: "In Production",
    description: "Creating your packs",
  },
  { keys: ["quality_check"], label: "Quality Check", description: "Checking quality" },
  { keys: ["packed"], label: "Packed", description: "Ready to ship" },
  { keys: ["shipped", "in_transit"], label: "Dispatched", description: "On the way" },
  { keys: ["delivered", "completed"], label: "Delivered", description: "Order complete" },
];

// IST timestamps — buyers and recipients are in India regardless of server TZ.
function fmtIST(d: Date) {
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export default async function OrderTrackPage({
  params,
}: {
  params: { id: string };
}) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    select: {
      orderNumber: true,
      status: true,
      packQuantity: true,
      createdAt: true,
      courierName: true,
      awbCode: true,
      trackingUrl: true,
      items: { select: { id: true, product: { select: { name: true } } } },
      timeline: { orderBy: { createdAt: "asc" }, select: { status: true, createdAt: true } },
      shipmentTracking: {
        select: {
          courierName: true,
          awbCode: true,
          status: true,
          currentLocation: true,
          estimatedDelivery: true,
          deliveredAt: true,
          trackingUrl: true,
        },
      },
    },
  });

  if (!order) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-normal text-ink mb-2">Order Not Found</h1>
          <p className="text-ink-3">
            We couldn&apos;t find this order in our system.
          </p>
        </div>
      </div>
    );
  }

  const isTerminated = order.status === "cancelled" || order.status === "refunded";
  const currentStepIndex = STATUS_STEPS.findIndex((s) =>
    s.keys.includes(order.status),
  );

  // Latest timeline event per step — a step's timestamp is when the order
  // (most recently) reached any of its statuses. Order creation itself doubles
  // as the "Confirmed" timestamp when no event was logged for it.
  const stepTimestamps = STATUS_STEPS.map((step, idx) => {
    const events = order.timeline.filter((e) => step.keys.includes(e.status));
    const latest = events[events.length - 1]?.createdAt ?? null;
    return latest ?? (idx === 0 ? order.createdAt : null);
  });

  // Courier details: the ShipmentTracking row wins; the denormalised Order
  // columns are the fallback for shipments created before it existed.
  const ship = order.shipmentTracking;
  const courierName = ship?.courierName ?? order.courierName;
  const awbCode = ship?.awbCode ?? order.awbCode;
  const trackingUrl = ship?.trackingUrl ?? order.trackingUrl;
  const showShipment = Boolean(courierName || awbCode || trackingUrl);

  return (
    <div className="min-h-screen bg-canvas py-8 px-4">
      <div className="container-gc-w max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-normal text-ink">Order Tracking</h1>
          <p className="text-ink-3 mt-1">
            Order #{order.orderNumber} · placed {fmtIST(order.createdAt)}
          </p>
        </div>

        {/* Pack contents — names only, no prices on the public page */}
        <div className="rounded-md border-2 border-bdr bg-white p-5 mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
            {order.packQuantity} gift pack{order.packQuantity === 1 ? "" : "s"} ·{" "}
            {order.items.length} product{order.items.length === 1 ? "" : "s"} each
          </p>
          <p className="mt-1.5 text-sm text-ink-2">
            {order.items.map((it) => it.product?.name ?? "Product").join(" · ")}
          </p>
        </div>

        {/* Cancelled / refunded orders get a plain notice instead of a stepper
            frozen mid-way with no explanation. */}
        {isTerminated ? (
          <div className="rounded-md border-2 border-red-200 bg-red-50 p-6 mb-8">
            <h2 className="font-semibold text-red-700">
              This order was {order.status === "cancelled" ? "cancelled" : "refunded"}.
            </h2>
            <p className="mt-1 text-sm text-red-700/80">
              If you have questions about this order, please contact us with the order number above.
            </p>
          </div>
        ) : (
          <div className="rounded-md border-2 border-bdr bg-white p-8 mb-6">
            <div className="space-y-6">
              {STATUS_STEPS.map((step, idx) => {
                const isCompleted = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const at = isCompleted ? stepTimestamps[idx] : null;

                return (
                  <div key={step.label} className="flex gap-6 relative">
                    {/* Timeline circle */}
                    <div className="flex flex-col items-center pt-1">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center font-normal text-sm border-2 ${
                          isCurrent
                            ? "bg-em text-white border-em ring-4 ring-em/20 animate-pulse"
                            : isCompleted
                              ? "bg-em text-white border-em"
                              : "bg-elevated border-bdr text-ink-3"
                        }`}
                      >
                        {isCompleted ? "✓" : idx + 1}
                      </div>
                      {idx < STATUS_STEPS.length - 1 && (
                        <div
                          className={`w-1 h-12 mt-1 ${
                            idx < currentStepIndex ? "bg-em" : "bg-bdr"
                          }`}
                        />
                      )}
                    </div>

                    {/* Step content */}
                    <div className="flex-1 pt-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                        <h3 className="font-normal text-ink">{step.label}</h3>
                        {at && (
                          <span className="text-xs text-ink-3 tabnum">{fmtIST(at)}</span>
                        )}
                      </div>
                      <p className="text-sm text-ink-2">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Courier details — appears once the shipment exists */}
        {!isTerminated && showShipment && (
          <div className="rounded-md border-2 border-bdr bg-white p-5">
            <div className="flex items-start gap-3">
              <Truck className="h-5 w-5 text-em-700 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="font-semibold text-ink">Shipment</p>
                {courierName && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-2">Courier:</span>
                    <span className="text-sm font-semibold text-ink">{courierName}</span>
                  </div>
                )}
                {awbCode && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-2">AWB number:</span>
                    <span className="text-sm font-semibold text-ink tabnum">{awbCode}</span>
                  </div>
                )}
                {ship?.currentLocation && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-2 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Last seen:
                    </span>
                    <span className="text-sm font-semibold text-ink">{ship.currentLocation}</span>
                  </div>
                )}
                {ship?.deliveredAt ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-2">Delivered:</span>
                    <span className="text-sm font-semibold text-ink">{fmtIST(ship.deliveredAt)}</span>
                  </div>
                ) : (
                  ship?.estimatedDelivery && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-2">Estimated delivery:</span>
                      <span className="text-sm font-semibold text-ink">
                        {ship.estimatedDelivery.toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          timeZone: "Asia/Kolkata",
                        })}
                      </span>
                    </div>
                  )
                )}
                {trackingUrl && (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-em hover:underline"
                  >
                    Track on courier site <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
