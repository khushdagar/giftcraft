import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { UploadLogoButton } from './upload-logo-button';

export const dynamic = 'force-dynamic';

export default async function AssetsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const company = await prisma.company.findFirst({
    where: {
      users: {
        some: { id: session.user.id },
      },
    },
  });

  // Logos are stored per company (BrandAsset.companyId). Until the user sets up
  // their company, there's nowhere to save reusable logos — so guide them there
  // rather than dead-ending. Logos uploaded during an order still attach to that
  // order; they only land in this library once a company exists.
  if (!company) {
    return (
      <div>
        <div className="mb-8 border-b border-bdr pb-8">
          <h1 className="text-3xl font-normal tracking-tight text-ink">Brand Assets</h1>
          <p className="mt-1 text-sm text-ink-2">
            Save logos once and reuse them on every gift pack.
          </p>
        </div>
        <div className="rounded-md border-2 border-dashed border-bdr bg-gray-50 p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-em-50">
            <Building2 className="h-6 w-6 text-em" />
          </div>
          <p className="font-medium text-ink">Set up your company first</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-2">
            Your logo library is saved under your company. Add your company details,
            then logos you upload here — or during an order — are saved for reuse.
          </p>
          <Button asChild variant="em" className="mt-5">
            <Link href="/dashboard/company">Set Up Your Company</Link>
          </Button>
        </div>
      </div>
    );
  }

  const assets = await prisma.brandAsset.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between border-b border-bdr pb-8">
        <div>
          <h1 className="text-3xl font-normal tracking-tight text-ink">Brand Assets</h1>
          <p className="mt-1 text-sm text-ink-2">
            Saved logos are reused when you build a gift pack.
          </p>
        </div>
        <UploadLogoButton />
      </div>

      {assets.length === 0 ? (
        <div className="rounded-md border-2 border-bdr bg-gray-50 p-12 text-center">
          <p className="text-ink-2 mb-4">No brand assets uploaded yet</p>
          <UploadLogoButton label="Upload Your Logo" full />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {assets.map((asset) => (
            <div key={asset.id} className="rounded-md border-2 border-bdr overflow-hidden bg-gray-50">
              <div className="aspect-square bg-white flex items-center justify-center p-3">
                {asset.url ? (
                  <img src={asset.url} alt={asset.name} className="max-h-full max-w-full object-contain" />
                ) : (
                  <p className="text-xs text-ink-3">No image</p>
                )}
              </div>
              <div className="p-2.5 border-t border-bdr">
                <h3 className="text-xs font-normal text-ink truncate">{asset.name}</h3>
                <p className="text-[10px] text-ink-3 mt-0.5">
                  {new Date(asset.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
