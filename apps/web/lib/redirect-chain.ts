import { prisma } from '@/lib/prisma';

/**
 * Chain guard for redirect rules.
 *
 * Two hops lose ranking signal and Google reports them as redirect chains, so
 * a new rule is refused when it would create one — in either direction:
 *   • A→B where B is itself redirected onward
 *   • A→B where something already points at A
 * Returns the message to show, or null when the rule is clean.
 */
export async function findChain(source: string, destination: string): Promise<string | null> {
  if (!destination.startsWith('/')) return null; // off-site target — not ours to resolve

  const target = destination.endsWith('/*') ? destination.slice(0, -2) : destination;

  const [onward, incoming] = await Promise.all([
    prisma.urlRedirect.findFirst({
      where: { source: target, isActive: true },
      select: { destination: true, statusCode: true },
    }),
    prisma.urlRedirect.findFirst({
      where: { destination: source, isActive: true },
      select: { source: true },
    }),
  ]);

  if (onward) {
    return onward.statusCode === 410
      ? `${target} is marked Gone (410) — pick a live page instead`
      : `${target} is itself redirected to ${onward.destination}. Point this at the final URL instead.`;
  }
  if (incoming) {
    return `${incoming.source} already redirects to ${source}, so this would create a chain. Repoint that rule first.`;
  }
  return null;
}
