import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Cap the connection pool so multiple app instances (web + api, and any scaled
// replicas) don't exhaust the managed Postgres connection limit — the cause of
// "Too many database connections opened: FATAL ..." in production.
//
// Appends connection_limit + pool_timeout to DATABASE_URL unless it (or a
// PgBouncer pooler) already specifies one. Override the size via
// PRISMA_CONNECTION_LIMIT if you scale up.
function pooledDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("connection_limit")) return url;
  const sep = url.includes("?") ? "&" : "?";
  const limit = process.env.PRISMA_CONNECTION_LIMIT || "5";
  return `${url}${sep}connection_limit=${limit}&pool_timeout=20`;
}

const datasourceUrl = pooledDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
