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
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
              <p className="text-sm text-gray-500 mt-1">{collections.length} collections</p>
            </div>
            <Button asChild>
              <Link href="/admin/collections/new">+ New Collection</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Products
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {collections.map((col) => (
                <tr key={col.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <p className="text-sm font-medium text-gray-900">{col.name}</p>
                    {col.description && (
                      <p className="text-xs text-gray-500 mt-1">{col.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <p className="text-sm text-gray-600">{col.products.length} products</p>
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
            <p className="text-gray-600 mb-4">No collections yet</p>
            <Button asChild>
              <Link href="/admin/collections/new">Create your first collection</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
