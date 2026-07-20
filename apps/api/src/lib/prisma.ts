import { PrismaClient } from '@prisma/client';

// Single shared Prisma client for the entire API process.
//
// Each `new PrismaClient()` opens its OWN connection pool. The API imports the
// workers (shiprocket-tracker, sla-checker) and shiprocket-sync into the same
// process, so three separate clients meant three pools — enough to exhaust the
// Digital Ocean managed Postgres connection cap ("too many clients already").
// Everything now shares this one pool, sized by `connection_limit` below.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Cap the pool so this process (plus the web app and any scaled replicas) stays
// under the managed Postgres connection limit. Appends connection_limit +
// pool_timeout to DATABASE_URL unless it (or a PgBouncer pooler) already sets
// one. Override via PRISMA_CONNECTION_LIMIT.
function pooledDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes('connection_limit')) return url;
  const sep = url.includes('?') ? '&' : '?';
  const limit = process.env.PRISMA_CONNECTION_LIMIT || '5';
  return `${url}${sep}connection_limit=${limit}&pool_timeout=20`;
}

const datasourceUrl = pooledDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
