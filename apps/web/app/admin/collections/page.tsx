import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const revalidate = 3600;

export default async function AdminCollectionsPage() {
  const session = await auth();

  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  const collections = await prisma.collection.findMany({
    include: {
      products: { select: { productId: true } },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="min-h-screen bg-canvas">
      <div className="border-b border-bdr">
        <div className="max-w-4xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-ink">Collections</h1>
              <p className="text-sm text-ink-2 mt-1">{collections.length} collections</p>
            </div>
            <Button asChild>
              <Link href="/admin/collections/new">+ New Collection</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="border border-bdr rounded-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-elevated border-b border-bdr">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-ink uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-ink uppercase">
                  Products
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-ink uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-ink uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bdr">
              {collections.map((col) => (
                <tr key={col.id} className="hover:bg-elevated transition">
                  <td className="px-6 py-3">
                    <p className="text-sm font-medium text-ink">{col.name}</p>
                    {col.description && (
                      <p className="text-xs text-ink-2 mt-1">{col.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <p className="text-sm text-ink-2">{col.products.length} products</p>
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={col.isActive ? 'em' : 'grey'}>
                      {col.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Link href={`/admin/collections/${col.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {collections.length === 0 && (
          <div className="text-center py-12">
            <p className="text-ink-2 mb-4">No collections yet</p>
            <Button asChild>
              <Link href="/admin/collections/new">Create your first collection</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
