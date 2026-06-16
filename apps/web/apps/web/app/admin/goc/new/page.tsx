import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import GocCampaignForm from "@/components/admin/goc/campaign-form";

export default async function AdminGocNewPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "super_admin") {
    redirect("/unauthorized");
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-bdr">
        <div className="max-w-3xl mx-auto p-8">
          <Link href="/admin/goc" className="text-em hover:underline">
            ← Back to Campaigns
          </Link>
          <h1 className="text-3xl font-black text-ink mt-4">
            Create Campaign
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-8">
        <div className="bg-canvas rounded-md border-2 border-bdr p-6">
          <GocCampaignForm />
        </div>
      </div>
    </div>
  );
}
