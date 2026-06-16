import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import GocCampaignForm from "@/components/admin/goc/campaign-form";

export default async function AdminGocDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "super_admin") {
    redirect("/unauthorized");
  }

  const campaign = await prisma.gocCampaign.findUnique({
    where: { id: params.id },
    include: {
      options: {
        include: {
          product: { select: { id: true, name: true, brand: true } },
        },
      },
      claims: {
        orderBy: { createdAt: "desc" },
        include: {
          option: { include: { product: { select: { name: true } } } },
        },
      },
    },
  });

  if (!campaign) {
    redirect("/admin/goc");
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-bdr">
        <div className="max-w-7xl mx-auto p-8">
          <Link href="/admin/goc" className="text-em hover:underline mb-4">
            ← Back to Campaigns
          </Link>
          <h1 className="text-3xl font-black text-ink mt-4">{campaign.name}</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        <div className="grid gap-8">
          {/* Form */}
          <div className="bg-canvas rounded-md border-2 border-bdr p-6">
            <h2 className="text-xl font-bold text-ink mb-6">Edit Campaign</h2>
            <GocCampaignForm campaign={campaign} />
          </div>

          {/* Claims */}
          <div className="bg-canvas rounded-md border-2 border-bdr p-6">
            <h2 className="text-xl font-bold text-ink mb-6">
              Claims ({campaign.claims.length})
            </h2>
            {campaign.claims.length === 0 ? (
              <p className="text-ink-2">No claims yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-bdr">
                      <th className="text-left py-3 px-4 font-semibold text-ink">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-ink">
                        Email
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-ink">
                        Product
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-ink">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaign.claims.map((claim) => (
                      <tr key={claim.id} className="border-b border-bdr">
                        <td className="py-3 px-4 text-ink">
                          {claim.claimerName}
                        </td>
                        <td className="py-3 px-4 text-ink-2">
                          {claim.claimerEmail}
                        </td>
                        <td className="py-3 px-4 text-ink">
                          {claim.option?.product?.name || "—"}
                        </td>
                        <td className="py-3 px-4 text-ink-2">
                          {new Date(claim.claimedAt!).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
