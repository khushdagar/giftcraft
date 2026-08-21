import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sortRules, type RedirectRule } from '@/lib/redirects';

/**
 * GET /api/redirects/map
 *
 * The active redirect rules, in the shape middleware matches against.
 * Middleware cannot reach Prisma (it runs in the Edge runtime), so it pulls the
 * rules from here once a minute and keeps them in memory — this endpoint is hit
 * once per server instance per minute, not once per visitor.
 *
 * Deliberately public: it only lists URLs that are already dead and already in
 * Google's index. It is marked noindex so it never becomes a page itself.
 */
export const dynamic = 'force-dynamic';

// A site should never have thousands of these; the cap stops a runaway import
// from turning every middleware refresh into a large payload.
const MAX_RULES = 5000;

export async function GET() {
  try {
    const rows = await prisma.urlRedirect.findMany({
      where: { isActive: true },
      select: { source: true, destination: true, statusCode: true },
      orderBy: { updatedAt: 'desc' },
      take: MAX_RULES,
    });

    const exact: Record<string, RedirectRule> = {};
    const prefix: RedirectRule[] = [];

    for (const row of rows) {
      const rule: RedirectRule = {
        source: row.source,
        destination: row.destination,
        status: (row.statusCode === 302 || row.statusCode === 410
          ? row.statusCode
          : 301) as RedirectRule['status'],
      };
      if (rule.source.endsWith('/*')) prefix.push(rule);
      else exact[rule.source] = rule;
    }

    return NextResponse.json(
      { exact, prefix: sortRules(prefix) },
      { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } }
    );
  } catch (error) {
    console.error('Failed to load redirect map:', error);
    // Fail open — an empty map means "no redirects", never a broken site.
    return NextResponse.json(
      { exact: {}, prefix: [] },
      { status: 200, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } }
    );
  }
}
