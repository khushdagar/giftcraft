import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VendorOverviewTab } from './components/vendor-overview-tab';
import { VendorPaymentsTab } from './components/vendor-payments-tab';
import { VendorCommunicationsTab } from './components/vendor-communications-tab';
import { VendorActiveToggle } from '../vendor-active-toggle';

export const revalidate = 60;

export default async function VendorDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      slug: true,
      contactName: true,
      email: true,
      phone: true,
      city: true,
      state: true,
      address: true,
      gst: true,
      paymentTerms: true,
      notes: true,
      isActive: true,
      score: true,
      priceConfirmedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!vendor) {
    redirect('/admin/vendors');
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8 flex items-start justify-between gap-4 border-b border-bdr pb-8">
        <div>
          <h1 className="text-3xl font-normal tracking-tight text-ink">{vendor.name}</h1>
          <p className="mt-2 text-sm text-ink-2">{vendor.contactName} • {vendor.email}</p>
        </div>
        <VendorActiveToggle vendorId={vendor.id} initialActive={vendor.isActive} />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <VendorOverviewTab vendor={vendor} />
        </TabsContent>

        <TabsContent value="payments">
          <VendorPaymentsTab vendorId={vendor.id} />
        </TabsContent>

        <TabsContent value="communications">
          <VendorCommunicationsTab vendorId={vendor.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
