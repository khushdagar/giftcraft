import { PrismaClient } from '@prisma/client';

// Single shared Prisma client for the entire API process.
//
// Each `new PrismaClient()` opens its OWN connection pool. The API imports the
// workers (shiprocket-tracker, sla-checker) and shiprocket-sync into the same
// process, so three separate clients meant three pools — enough to exhaust the
// Digital Ocean managed Postgres connection cap ("too many clients already").
// Everything now shares this one pool (sized by `connection_limit` in the URL).
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
