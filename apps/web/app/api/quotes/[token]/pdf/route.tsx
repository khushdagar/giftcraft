import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { QuotePDF } from '@/components/checkout/quote-pdf';

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    const quote = await prisma.quote.findUnique({
      where: { shareToken: token },
      select: {
        id: true,
        payload: true,
        expiresAt: true,
      },
    });

    if (!quote) {
      return new Response('Quote not found', { status: 404 });
    }

    if (quote.expiresAt < new Date()) {
      return new Response('Quote expired', { status: 410 });
    }

    const payload = quote.payload as any;
    const buffer = await renderToBuffer(
      <QuotePDF
        quoteId={quote.id}
        expiresAt={quote.expiresAt}
        payload={payload}
        shareToken={token}
      />
    );

    return new Response(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="quote-${token}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response('Failed to generate PDF', { status: 500 });
  }
}
