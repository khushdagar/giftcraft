import { prisma } from "@/lib/prisma";
import { formatRupees } from "@/lib/utils";

// Each visible step maps to one or more actual OrderStatus values so the
// progress bar tracks the real order state (incl. the mockup-approval stages).
const STATUS_STEPS = [
  {
    keys: ["confirmed", "mockup_pending", "mockup_approved"],
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
          <h1 className="text-3xl font-normal text-ink mb-2">Order Not Found</h1>
          <p className="text-ink-3">
            We couldn't find this order in our system.
          </p>
        </div>
      </div>
    );
  }

  const currentStepIndex = STATUS_STEPS.findIndex((s) =>
    s.keys.includes(order.status),
  );
  return (
    <div className="min-h-screen bg-canvas py-8 px-4">
      <div className="container-gc-w max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-normal text-ink">Order Tracking</h1>
          <p className="text-ink-3 mt-1">Order #{order.orderNumber}</p>
        </div>

        {/* Status Timeline */}
        <div className="rounded-md border-2 border-bdr bg-white p-8 mb-8">
          <div className="space-y-6">
            {STATUS_STEPS.map((step, idx) => {
              const isCompleted = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;

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
                    <h3 className="font-normal text-ink">{step.label}</h3>
                    <p className="text-sm text-ink-2">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
