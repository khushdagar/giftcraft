import { PrismaClient } from "@prisma/client";
import { auditExtension } from "./audit";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaBase?: PrismaClient;
};

// Cap the connection pool so multiple app instances (web + api, and any scaled
// replicas) don't exhaust the managed Postgres connection limit — the cause of
// "Too many database connections opened: FATAL ..." in production.
//
// Appends connection_limit + pool_timeout to DATABASE_URL unless it (or a
// PgBouncer pooler) already specifies one. Override the size via
// PRISMA_CONNECTION_LIMIT if you scale up.
// `next build` renders pages in several worker processes, each of which creates
// its own PrismaClient. workers × pool size is what actually hits the server, so
// a 5-connection pool becomes 40+ connections on a multi-core box and the
// managed Postgres refuses them ("FATAL: sorry, too many clients already").
// During the build phase one connection per worker is plenty — page rendering is
// sequential inside a worker.
const IS_BUILD = process.env.NEXT_PHASE === "phase-production-build";

function pooledDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("connection_limit")) return url;
  const sep = url.includes("?") ? "&" : "?";
  const limit = process.env.PRISMA_CONNECTION_LIMIT || (IS_BUILD ? "1" : "5");
  return `${url}${sep}connection_limit=${limit}&pool_timeout=20`;
}

const datasourceUrl = pooledDatabaseUrl();

// The un-extended client. Used by the audit logger itself (so writing a log
// entry can't re-enter the audit extension) and as the base for `prisma`.
const base =
  globalForPrisma.prismaBase ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
globalForPrisma.prismaBase = base;

// Everything in the app writes through this one, which records admin changes to
// AdminActivityLog. Cast back to PrismaClient so existing call sites and the
// NextAuth Prisma adapter keep their types — the extended client is a runtime
// superset.
export const prisma =
  globalForPrisma.prisma ??
  (base.$extends(auditExtension(base)) as unknown as PrismaClient);

// Cache on globalThis in every environment. In dev this stops HMR from leaking a
// client per reload; during `next build` (NODE_ENV=production) it stops each
// re-evaluated module graph inside a worker from opening a second pool.
globalForPrisma.prisma = prisma;
