import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminGocPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "super_admin") {
    redirect("/unauthorized");
  }

  const campaigns = await prisma.gocCampaign.findMany({
    include: {
      _count: { select: { options: true, claims: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-bdr">
        <div className="max-w-7xl mx-auto p-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-black text-ink">GOC Campaigns</h1>
              <p className="text-ink-2 mt-2">{campaigns.length} campaigns</p>
            </div>
            <Link
              href="/admin/goc/new"
              className="px-6 py-2 bg-em text-white rounded-lg font-semibold hover:bg-em-600 transition"
            >
              + New Campaign
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-ink-2 mb-4">No campaigns yet</p>
            <Link
              href="/admin/goc/new"
              className="text-em hover:underline font-semibold"
            >
              Create your first campaign
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-bdr bg-elevated">
                  <th className="text-left py-3 px-4 font-semibold text-ink">
                    Campaign
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-ink">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-ink">
                    Options
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-ink">
                    Claims
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-ink">
                    Expires
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-ink">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="border-b border-bdr hover:bg-elevated transition"
                  >
                    <td className="py-4 px-4">
                      <p className="font-semibold text-ink">{campaign.name}</p>
                      <p className="text-sm text-ink-2">/{campaign.slug}</p>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          campaign.status === "active"
                            ? "bg-em-50 text-em"
                            : campaign.status === "draft"
                              ? "bg-gray-100 text-gray-700"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {campaign.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-ink">
                      {campaign._count.options}
                    </td>
                    <td className="py-4 px-4 text-ink">
                      {campaign._count.claims}
                    </td>
                    <td className="py-4 px-4 text-sm text-ink-2">
                      {campaign.expiresAt
                        ? new Date(campaign.expiresAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-4 px-4">
                      <Link
                        href={`/admin/goc/${campaign.id}`}
                        className="text-em hover:underline font-semibold text-sm"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
