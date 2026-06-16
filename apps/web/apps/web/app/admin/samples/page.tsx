import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminSamplesClient from "@/components/admin/samples/admin-samples-client";

export default async function AdminSamplesPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "super_admin") {
    redirect("/unauthorized");
  }

  const sampleOrders = await prisma.sampleOrder.findMany({
    include: {
      product: {
        select: {
          id: true,
          name: true,
          brand: true,
          images: {
            where: { isPrimary: true },
            select: { url: true },
            take: 1,
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-bdr">
        <div className="max-w-7xl mx-auto p-8">
          <h1 className="text-3xl font-black text-ink">Sample Orders</h1>
          <p className="text-ink-2 mt-2">{sampleOrders.length} requests</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        <AdminSamplesClient initialOrders={sampleOrders} />
      </div>
    </div>
  );
}
