import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { GiftCollectionForm } from '@/components/admin/gift-collections/gift-collection-form';

export const dynamic = 'force-dynamic';

export default async function NewGiftCollectionPage({
  searchParams,
}: {
  searchParams: { parent?: string };
}) {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  // Only top-level collections can be parents — the tree is capped at two levels.
  const parentOptions = await prisma.giftCollection.findMany({
    where: { parentId: null },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  });

  // "+ Sub-collection" from a collection row pre-selects that parent.
  const presetParent = searchParams.parent
    ? parentOptions.find((o) => o.id === searchParams.parent)
    : undefined;

  return (
    <div className="min-h-screen">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-normal text-gray-900">
          {presetParent ? `New Sub-collection in ${presetParent.name}` : 'New Curated Collection'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {presetParent
            ? 'A sub-collection groups packs under its parent. Create it first, then add packs.'
            : 'A collection groups packs — or sub-collections — under one theme. Create it first, then add what goes inside.'}
        </p>
      </div>

      <div className="py-6">
        <GiftCollectionForm
          mode="create"
          parentOptions={parentOptions}
          presetParentId={presetParent?.id ?? null}
        />
      </div>
    </div>
  );
}
