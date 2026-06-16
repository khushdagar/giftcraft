"use client";

import { useState } from "react";
import { toast } from "sonner";

interface SampleOrder {
  id: string;
  status: string;
  adminNotes?: string;
  createdAt: Date;
  product: {
    name: string;
    brand?: string;
  };
  user: {
    name?: string;
    email: string;
  };
}

interface AdminSamplesClientProps {
  initialOrders: SampleOrder[];
}

export default function AdminSamplesClient({
  initialOrders,
}: AdminSamplesClientProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");

  const handleStatusUpdate = async (
    orderId: string,
    status: "approved" | "rejected" | "shipped"
  ) => {
    try {
      const res = await fetch(`/api/admin/samples/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          adminNotes: editNotes,
        }),
      });

      if (!res.ok) throw new Error("Failed to update");

      setOrders(
        orders.map((o) =>
          o.id === orderId ? { ...o, status, adminNotes: editNotes } : o
        )
      );
      setEditingId(null);
      setEditNotes("");
      toast.success(`Sample marked as ${status}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-em-50 text-em";
      case "shipped":
        return "bg-sky-50 text-sky-700";
      case "rejected":
        return "bg-err-50 text-err";
      default:
        return "bg-yellow-50 text-yellow-700";
    }
  };

  return (
    <div className="space-y-6">
      {orders.length === 0 ? (
        <p className="text-ink-2">No sample orders yet</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="border-2 border-bdr rounded-md p-4 hover:bg-elevated transition"
            >
              <div className="grid grid-cols-5 gap-4 mb-3">
                <div>
                  <p className="text-xs text-ink-2 font-semibold uppercase">
                    Product
                  </p>
                  <p className="font-semibold text-ink">{order.product.name}</p>
                  {order.product.brand && (
                    <p className="text-sm text-ink-2">{order.product.brand}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-ink-2 font-semibold uppercase">
                    Customer
                  </p>
                  <p className="font-semibold text-ink">{order.user.name}</p>
                  <p className="text-sm text-ink-2">{order.user.email}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-2 font-semibold uppercase">
                    Status
                  </p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}
                  >
                    {order.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-ink-2 font-semibold uppercase">
                    Requested
                  </p>
                  <p className="text-sm text-ink">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-2 font-semibold uppercase">
                    Actions
                  </p>
                  <div className="flex gap-2">
                    {order.status === "requested" && (
                      <>
                        <button
                          onClick={() => setEditingId(order.id)}
                          className="text-em text-sm font-semibold hover:underline"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            handleStatusUpdate(order.id, "rejected")
                          }
                          className="text-err text-sm font-semibold hover:underline"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {order.status === "approved" && (
                      <button
                        onClick={() =>
                          handleStatusUpdate(order.id, "shipped")
                        }
                        className="text-sky-700 text-sm font-semibold hover:underline"
                      >
                        Mark Shipped
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {editingId === order.id && (
                <div className="border-t border-bdr pt-4 mt-4 space-y-3">
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Admin notes (optional)"
                    className="w-full px-3 py-2 border-2 border-bdr rounded-md text-sm text-ink focus:border-em focus:outline-none"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleStatusUpdate(order.id, "approved")
                      }
                      className="px-4 py-2 bg-em text-white rounded-md text-sm font-semibold hover:bg-em-600"
                    >
                      Confirm Approve
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditNotes("");
                      }}
                      className="px-4 py-2 border-2 border-bdr text-ink rounded-md text-sm font-semibold hover:bg-elevated"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
