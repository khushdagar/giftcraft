import { auth } from '@/auth';
import { loadCatalogue, renderCataloguePdf } from '@/lib/catalogue-render';
import { isProgressToken, progressReporter } from '@/lib/catalogue-progress';

// Products and images are resolved per request, so this route must never be
// statically rendered or cached — a category catalogue changes as products do.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/admin/catalogues/[id]/pdf — download the catalogue (super_admin).
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  // ?inline=1 opens the PDF in the browser tab (preview) instead of downloading.
  const inline = new URL(req.url).searchParams.get('inline') === '1';
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return new Response('Unauthorized', { status: 403 });
    }

    const catalogue = await loadCatalogue({ id: params.id });
    if (!catalogue) return new Response('Catalogue not found', { status: 404 });

    // Timed so the platform logs show how close a large (category) catalogue
    // gets to the request timeout / memory ceiling.
    const started = Date.now();
    // ?progress=<token> lets the builder's download bar poll how far we are.
    const token = new URL(req.url).searchParams.get('progress');
    const buffer = await renderCataloguePdf(
      catalogue,
      isProgressToken(token) ? progressReporter(token) : undefined
    );
    console.log(
      `catalogue pdf "${catalogue.slug}": ${catalogue.sections.length} sections, ` +
        `${(buffer.length / 1024 / 1024).toFixed(1)} MB in ${Date.now() - started}ms, ` +
        `rss ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`
    );

    return new Response(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        // Needed for the download bar's last stretch (bytes received / total).
        'Content-Length': String(buffer.length),
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="givoo-catalogue-${catalogue.slug}.pdf"`,
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
