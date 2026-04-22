import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRupees } from "@/lib/utils";

const ORDERS = [
  { id: "GC-2026-0142", name: "New Hire Welcome Kit × 50", status: "Production", variant: "em" as const, amt: 69465, eta: "18 Jan" },
  { id: "GC-2026-0138", name: "Diwali Premium Hamper × 150", status: "Mockup Review", variant: "gold" as const, amt: 224850, eta: "24 Jan" },
  { id: "GC-2026-0135", name: "Client VIP Box × 25", status: "Quality Check", variant: "em" as const, amt: 87500, eta: "16 Jan" },
  { id: "GC-2026-0132", name: "Team Sports Pack × 80", status: "Delivered", variant: "grey" as const, amt: 59920, eta: "Delivered" },
  { id: "GC-2026-0128", name: "Onboarding Kit × 30", status: "Delivered", variant: "grey" as const, amt: 26970, eta: "Delivered" },
];

export default function OrdersPage() {
  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="overline text-ink-3">Orders</p>
          <h1 className="mt-1 t-heading">Your <span className="italic-em">history.</span></h1>
        </div>
        <Button asChild variant="em"><Link href="/builder">New Order</Link></Button>
      </div>

      <div className="flex gap-1 rounded-gc-p bg-elevated p-1">
        {["All", "Active", "Mockup Review", "Production", "Delivered"].map((t, i) => (
          <button key={t} className={`rounded-gc-p px-4 py-1.5 text-xs font-semibold transition ${i === 0 ? "bg-white text-ink shadow-card" : "text-ink-2 hover:text-ink"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="rounded-gc bg-white shadow-card">
        <div className="grid grid-cols-12 gap-3 border-b border-bdr px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-ink-3">
          <div className="col-span-4">Order</div>
          <div className="col-span-3 hidden sm:block">Status</div>
          <div className="col-span-2 hidden sm:block">Amount</div>
          <div className="col-span-2 hidden sm:block">ETA</div>
          <div className="col-span-1"></div>
        </div>
        {ORDERS.map((o) => (
          <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="grid grid-cols-12 items-center gap-3 border-b border-bdr px-5 py-4 text-sm transition last:border-0 hover:bg-elevated">
            <div className="col-span-11 sm:col-span-4">
              <p className="font-medium">{o.name}</p>
              <p className="mt-0.5 text-xs text-ink-3 tabnum">{o.id}</p>
            </div>
            <div className="col-span-3 hidden sm:block"><Badge variant={o.variant}>{o.status}</Badge></div>
            <div className="col-span-2 hidden font-semibold sm:block tabnum">{formatRupees(o.amt)}</div>
            <div className="col-span-2 hidden text-xs text-ink-2 sm:block">{o.eta}</div>
            <div className="col-span-1 text-right text-ink-3">→</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
