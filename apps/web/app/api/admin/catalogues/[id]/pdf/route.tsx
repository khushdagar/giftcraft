import { auth } from '@/auth';
import { loadCatalogue, renderCataloguePdf } from '@/lib/catalogue-render';

// Products and images are resolved per request, so this route must never be
// statically rendered or cached — a category catalogue changes as products do.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/admin/catalogues/[id]/pdf — download the catalogue (super_admin).
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return new Response('Unauthorized', { status: 403 });
    }

    const catalogue = await loadCatalogue({ id: params.id });
    if (!catalogue) return new Response('Catalogue not found', { status: 404 });

    const buffer = await renderCataloguePdf(catalogue);

    return new Response(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="givoo-catalogue-${catalogue.slug}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    if ((error as Error)?.message === 'NO_PRODUCTS') {
      return new Response('This catalogue has no products to print yet', { status: 422 });
    }
    console.error('Error generating catalogue PDF:', error);
    return new Response('Failed to generate catalogue', { status: 500 });
  }
}
