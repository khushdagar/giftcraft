import { auth } from '@/auth';
import { renderCompleteCataloguePdf } from '@/lib/catalogue-render';

// Every category is queried live per request — never statically rendered.
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/admin/catalogues/complete/pdf — the whole range in one PDF
 * (super_admin): every category with three or more active products, each as
 * its own section, in the same design as a built catalogue.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return new Response('Unauthorized', { status: 403 });
    }

    const buffer = await renderCompleteCataloguePdf();

    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="givoo-complete-catalogue-${stamp}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    if ((error as Error)?.message === 'NO_PRODUCTS') {
      return new Response('No category has three or more active products yet', { status: 422 });
    }
    console.error('Error generating complete catalogue:', error);
    return new Response('Failed to generate the complete catalogue', { status: 500 });
  }
}
