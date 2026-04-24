import { prisma } from "@/lib/prisma";
import { formatRupees } from "@/lib/utils";

const STATUS_STEPS = [
  { key: "confirmed", label: "Confirmed", description: "Order received" },
  {
    key: "in_production",
    label: "In Production",
    description: "Creating your packs",
  },
  { key: "qc", label: "Quality Check", description: "Checking quality" },
  { key: "packed", label: "Packed", description: "Ready to ship" },
  { key: "dispatched", label: "Dispatched", description: "On the way" },
  { key: "delivered", label: "Delivered", description: "Order complete" },
];

export default async function OrderTrackPage({
  params,
}: {
  params: { id: string };
}) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!order) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-black text-ink mb-2">Order Not Found</h1>
          <p className="text-ink-3">
            We couldn't find this order in our system.
          </p>
        </div>
      </div>
    );
  }

  const currentStepIndex = STATUS_STEPS.findIndex(
    (s) => s.key === order.status,
  );
  const estimatedDelivery = new Date(order.createdAt);
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

  return (
    <div className="min-h-screen bg-canvas py-8 px-4">
      <div className="container-gc-w max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-ink">Order Tracking</h1>
          <p className="text-ink-3 mt-1">Order #{order.orderNumber}</p>
        </div>

        {/* Status Timeline */}
        <div className="rounded-md border-2 border-bdr bg-white p-8 mb-8">
          <div className="space-y-6">
            {STATUS_STEPS.map((step, idx) => {
              const isCompleted = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;

              return (
                <div key={step.key} className="flex gap-6 relative">
                  {/* Timeline circle */}
                  <div className="flex flex-col items-center pt-1">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center font-black text-sm border-2 ${
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
                    <h3 className="font-semibold text-ink">{step.label}</h3>
                    <p className="text-sm text-ink-2">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Items */}
          <div className="rounded-md border-2 border-bdr bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-4">
              Items
            </p>
            <div className="space-y-2">
              {order.items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-ink">{item.productName}</span>
                  <span className="text-ink-2">×{item.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Details */}
          <div className="rounded-md border-2 border-bdr bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-4">
              Delivery
            </p>
            {order.billingJson && (
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-ink-3 text-xs">To</p>
                  <p className="text-ink font-semibold">
                    {(order.billingJson as any).companyName}
                  </p>
                </div>
                <div>
                  <p className="text-ink-3 text-xs">Estimated Delivery</p>
                  <p className="text-ink font-semibold">
                    {estimatedDelivery.toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
