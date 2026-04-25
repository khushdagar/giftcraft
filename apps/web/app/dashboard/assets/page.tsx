import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Upload } from 'lucide-react';

export const revalidate = 60;

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

  if (!company) {
    return (
      <div className="rounded-md border-2 border-bdr bg-gray-50 p-12 text-center">
        <p className="text-ink-2">You are not associated with any company</p>
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
          <h1 className="text-3xl font-black tracking-tight text-ink">Brand Assets</h1>
          <p className="mt-1 text-sm text-ink-2">Manage logos and brand materials</p>
        </div>
        <Button variant="em" className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload Asset
        </Button>
      </div>

      {assets.length === 0 ? (
        <div className="rounded-md border-2 border-bdr bg-gray-50 p-12 text-center">
          <p className="text-ink-2 mb-4">No brand assets uploaded yet</p>
          <Button variant="em" className="flex items-center gap-2 mx-auto">
            <Upload className="h-4 w-4" />
            Upload Your Logo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((asset) => (
            <div key={asset.id} className="rounded-md border-2 border-bdr overflow-hidden bg-gray-50">
              <div className="aspect-square bg-white flex items-center justify-center">
                {asset.url ? (
                  <img src={asset.url} alt={asset.name} className="max-h-full max-w-full" />
                ) : (
                  <p className="text-ink-3">No image</p>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-ink truncate">{asset.name}</h3>
                <p className="text-xs text-ink-3 mt-1">
                  {new Date(asset.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
