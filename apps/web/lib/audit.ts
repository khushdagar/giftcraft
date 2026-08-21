import type { PrismaClient, Prisma } from "@prisma/client";
import { Prisma as PrismaNS } from "@prisma/client";

/**
 * Admin activity logging.
 *
 * Rather than sprinkling `logChange(...)` calls across ~60 admin route files
 * (and forgetting it on the 61st), we hook Prisma itself: every write that
 * happens while serving an admin mutation (an `/api/admin/*` call, or a server
 * action posting to an `/admin/*` page) from a signed-in admin is recorded in
 * AdminActivityLog with the actor's name + email and a field-level diff of what
 * changed.
 *
 * Two pieces make the "while serving an admin mutation" test work:
 *   1. middleware.ts stamps `x-audit-path` / `x-audit-method` onto the request.
 *   2. `headers()` is readable from anywhere inside that request's async scope,
 *      including from inside this extension.
 * Outside a request (seeds, cron, BullMQ workers) `headers()` throws, we swallow
 * it and log nothing — which is exactly what we want.
 */

const WRITE_OPS = new Set([
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
]);

// Models whose writes are pure noise or would recurse into the logger itself.
const IGNORED_MODELS = new Set([
  "AdminActivityLog",
  "Session",
  "Account",
  "VerificationToken",
  "PriceAuditLog",
  // Read receipts and device registrations: bookkeeping, not decisions.
  // They were 870 of the first 1,279 log rows and buried everything else.
  "AdminNotificationRead",
  "PushSubscription",
]);

// Never persist secrets, and never persist megabyte-sized blobs.
const SECRET_KEY = /password|secret|token|apikey|api_key/i;
const MAX_STRING = 400;

// Whichever of these the record has is shown in the log as the record's name,
// so a row reads `Added a URL redirect "/old-page"` rather than a bare cuid.
const LABEL_KEYS = [
  "name",
  "title",
  "orderNumber",
  "slug",
  "sku",
  "subject",
  "source",
  "companyName",
  "contactName",
  "recipientName",
  "email",
  "code",
  "label",
];

const ADMIN_ROLES = new Set(["super_admin", "company_admin"]);

type Actor = {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

/** The request we are inside, if it is an admin API call. */
async function auditRequest(): Promise<{ path: string; method: string } | null> {
  try {
    const { headers } = await import("next/headers");
    const h = headers();
    // Set by middleware.ts, and only for admin mutations.
    const path = h.get("x-audit-path");
    if (!path) return null;
    return { path, method: h.get("x-audit-method") || "" };
  } catch {
    // Not inside a request scope (script, worker, build) — nothing to log.
    return null;
  }
}

/** The signed-in admin making the request, or null if they are not one. */
async function auditActor(): Promise<Actor | null> {
  try {
    const { auth } = await import("@/auth");
    const session = await auth();
    const user = session?.user;
    if (!user || !ADMIN_ROLES.has(String(user.role))) return null;
    return { id: user.id, name: user.name, email: user.email, role: String(user.role) };
  } catch {
    return null;
  }
}

function sanitize(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (value instanceof Date) return value.toISOString();
  if (PrismaNS.Decimal.isDecimal(value)) return String(value);
  if (typeof value === "string") {
    if (value.startsWith("data:")) return `[inline data, ${value.length} chars]`;
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}...` : value;
  }
  if (typeof value === "bigint") return String(value);
  if (typeof value !== "object") return value;
  if (depth >= 3) return "[...]";
  if (Array.isArray(value)) {
    const head = value.slice(0, 20).map((v) => sanitize(v, depth + 1));
    return value.length > 20 ? [...head, `+${value.length - 20} more`] : head;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY.test(k)) {
      out[k] = "[redacted]";
      continue;
    }
    // Prisma scalar-list writes look like { set: [...] } — unwrap for readability.
    if (v && typeof v === "object" && !Array.isArray(v) && "set" in (v as object)) {
      out[k] = sanitize((v as { set: unknown }).set, depth + 1);
      continue;
    }
    out[k] = sanitize(v, depth + 1);
  }
  return out;
}

function labelOf(record: unknown): string | null {
  if (!record || typeof record !== "object") return null;
  const r = record as Record<string, unknown>;
  for (const key of LABEL_KEYS) {
    const v = r[key];
    if (typeof v === "string" && v.trim()) return v.slice(0, 120);
  }
  return null;
}

function idOf(record: unknown): string | null {
  if (!record || typeof record !== "object") return null;
  const id = (record as Record<string, unknown>).id;
  if (typeof id === "string") return id;
  if (typeof id === "number") return String(id);
  return null;
}

/** { field: { from, to } } for the keys the write actually changed. */
function diff(before: Record<string, unknown>, data: Record<string, unknown>) {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const [key, rawTo] of Object.entries(data)) {
    if (SECRET_KEY.test(key)) {
      changes[key] = { from: "[redacted]", to: "[redacted]" };
      continue;
    }
    const to = sanitize(rawTo);
    if (!(key in before)) {
      // Relation write (connect/create/set on a related model) — record the
      // intent; resolving the previous related rows is not worth a query storm.
      changes[key] = { from: null, to };
      continue;
    }
    const from = sanitize(before[key]);
    if (JSON.stringify(from) !== JSON.stringify(to)) changes[key] = { from, to };
  }
  return changes;
}

export function auditExtension(base: PrismaClient) {
  // Re-read the row a single-record write targets so we can diff old vs new.
  const readBefore = async (model: string, where: unknown) => {
    if (!where || typeof where !== "object") return null;
    try {
      const key = model.charAt(0).toLowerCase() + model.slice(1);
      const delegate = (base as unknown as Record<string, { findFirst?: Function }>)[key];
      if (!delegate?.findFirst) return null;
      return (await delegate.findFirst({ where })) as Record<string, unknown> | null;
    } catch {
      return null;
    }
  };

  const write = async (row: Prisma.AdminActivityLogUncheckedCreateInput) => {
    try {
      await base.adminActivityLog.create({ data: row });
    } catch (e) {
      // Auditing must never break the admin action it is recording.
      console.error("[audit] failed to write activity log", e);
    }
  };

  return PrismaNS.defineExtension({
    name: "admin-activity-log",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !WRITE_OPS.has(operation) || IGNORED_MODELS.has(model)) {
            return query(args);
          }

          const req = await auditRequest();
          if (!req) return query(args);
          const actor = await auditActor();
          if (!actor) return query(args);

          const a = (args ?? {}) as Record<string, any>;
          const singleTarget =
            operation === "update" || operation === "delete" || operation === "upsert";
          const before = singleTarget ? await readBefore(model, a.where) : null;

          const result = await query(args);

          const data =
            operation === "upsert" ? (before ? a.update : a.create) : a.data;

          let changes: unknown;
          if (operation === "delete" || operation === "deleteMany") {
            changes = before ? sanitize(before) : sanitize(a.where);
          } else if (before && data && typeof data === "object" && !Array.isArray(data)) {
            changes = diff(before, data as Record<string, unknown>);
          } else {
            changes = sanitize(data);
          }

          const action = operation === "upsert" ? (before ? "update" : "create") : operation;

          await write({
            actorId: actor.id ?? null,
            actorName: actor.name ?? null,
            actorEmail: actor.email ?? null,
            actorRole: actor.role ?? null,
            action,
            entity: model,
            entityId:
              idOf(result) ??
              idOf(before) ??
              (typeof a.where?.id === "string" ? a.where.id : null),
            entityLabel: labelOf(result) ?? labelOf(before) ?? labelOf(data),
            changes: (changes ?? null) as Prisma.InputJsonValue,
            path: req.path,
            method: req.method,
          });

          return result;
        },
      },
    },
  });
}
