import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Plus } from 'lucide-react';

export const revalidate = 3600;

export default async function AdminOccasionsPage() {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const occasions = await prisma.occasionConfig.findMany({
    include: {
      products: { select: { productId: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <>
      <div className="mb-8 border-b border-bdr pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-normal tracking-tight text-ink">Occasions</h1>
            <p className="mt-1 text-sm text-ink-2">Manage gifting occasions and link products</p>
          </div>
          <Button asChild className="rounded-2xl bg-em px-6 py-2 font-normal hover:bg-em-600">
            <Link href="/admin/occasions/new">
              <Plus className="w-4 h-4 mr-2" />
              New Occasion
            </Link>
          </Button>
        </div>
      </div>

      {occasions.length === 0 ? (
        <div className="text-center py-12 bg-canvas rounded-lg border-2 border-bdr">
          <p className="text-ink-2 mb-4 text-lg">No occasions yet</p>
          <Button asChild>
            <Link href="/admin/occasions/new">Create your first occasion</Link>
          </Button>
        </div>
      ) : (
        <div className="border border-bdr rounded-lg overflow-hidden bg-white">
          <table className="w-full">
            <thead className="bg-elevated border-b border-bdr">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">
                  Occasion
                </th>
                <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">
                  Icon
                </th>
                <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">
                  Products
                </th>
                <th className="px-6 py-4 text-left text-xs font-normal text-ink-2 uppercase">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-normal text-ink-2 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bdr">
              {occasions.map((occ) => (
                <tr key={occ.id} className="hover:bg-canvas transition">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-ink">{occ.name}</p>
                      <p className="text-xs text-ink-2 mt-1">/{occ.slug}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-2xl">{occ.icon || '🎁'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-ink-2">{occ.products.length} products</p>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={occ.isActive ? 'em' : 'grey'}>
                      {occ.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Link href={`/admin/occasions/${occ.id}/edit`} className="inline-block">
                      <Button variant="outline" size="sm" className="rounded-lg">
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
