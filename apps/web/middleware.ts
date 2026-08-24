import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import { matchRedirect, type RedirectRule } from "@/lib/redirects";

// ── SEO redirect rules ──────────────────────────────────────────────────────
// Admin-managed redirects for URLs Google still has indexed (/admin/redirects).
// They live in Postgres, which middleware cannot read directly — the Edge
// runtime has no Prisma — so the rule set is pulled from /api/redirects/map and
// held in module memory. One refresh per server instance per minute, served
// stale while the refresh runs, and failing open to "no redirects" so a hiccup
// in the feed can never take the storefront down.
interface RuleSet {
  exact: Record<string, RedirectRule>;
  prefix: RedirectRule[];
}
const RULES_TTL_MS = 60_000;
let rules: RuleSet = { exact: {}, prefix: [] };
let rulesFetchedAt = 0;
let rulesInFlight: Promise<void> | null = null;

// Prefer an in-container loopback over the public origin: on DO App Platform
// (and most container hosts) a request from the app back to its own public
// hostname has to leave the container, cross Cloudflare, and hairpin back —
// a round trip that gets silently dropped on this kind of setup. Hitting
// 127.0.0.1:$PORT reaches the same Next.js process directly, no network hop.
function selfOrigin(publicOrigin: string): string {
  const port = process.env.PORT;
  return port ? `http://127.0.0.1:${port}` : publicOrigin;
}

function refreshRules(origin: string): Promise<void> {
  if (rulesInFlight) return rulesInFlight;
  rulesInFlight = (async () => {
    try {
      const res = await fetch(`${selfOrigin(origin)}/api/redirects/map`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as RuleSet;
        rules = { exact: data.exact ?? {}, prefix: data.prefix ?? [] };
      } else {
        console.error(`Redirect rules refresh got HTTP ${res.status}`);
      }
    } catch (err) {
      // Keep whatever we had; the timestamp below stops a tight retry loop.
      console.error("Redirect rules refresh failed:", err);
    } finally {
      rulesFetchedAt = Date.now();
      rulesInFlight = null;
    }
  })();
  return rulesInFlight;
}

// Paths that can never be a redirect source, checked before the map is even
// consulted so app traffic pays nothing for this feature.
function skipRedirects(pathname: string): boolean {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/vendor") ||
    pathname === "/" ||
    pathname === "/login"
  );
}

// Simple middleware that just redirects to login if no session cookie exists
// Session verification happens server-side in pages (cannot use Prisma in Edge Runtime)
export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  // ── Admin-managed SEO redirects ──
  // Runs first: a redirect must win before anything else looks at the path.
  // GET/HEAD only — redirecting a POST would silently drop its body.
  if ((request.method === "GET" || request.method === "HEAD") && !skipRedirects(pathname)) {
    const age = Date.now() - rulesFetchedAt;
    if (rulesFetchedAt === 0) {
      // Cold instance — the very first request waits for the rules once.
      await refreshRules(request.nextUrl.origin);
    } else if (age > RULES_TTL_MS) {
      // Warm but stale: answer from the old map, refresh behind the response.
      event.waitUntil(refreshRules(request.nextUrl.origin));
    }

    const hit = matchRedirect(pathname, rules);
    if (hit) {
      if (hit.status === 410) {
        // Deliberately dead: tells Google to drop the URL faster than a 404.
        return new NextResponse(
          "<!doctype html><title>Gone</title><p>This page has been removed.</p>",
          { status: 410, headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }
      const target = new URL(hit.destination, request.url);
      // Carry the visitor's query string over unless the rule set its own
      // (utm_* tags and ?page= should survive the hop).
      if (!target.search && request.nextUrl.search) target.search = request.nextUrl.search;
      return NextResponse.redirect(target, hit.status);
    }
  }

  // Check if authjs session cookie exists.
  // On HTTPS (production) NextAuth v5 prefixes the cookie with "__Secure-";
  // on HTTP (localhost) it does not. Check both so the gate works in both envs.
  const sessionCookie =
    request.cookies.get("authjs.session-token")?.value ??
    request.cookies.get("__Secure-authjs.session-token")?.value;

  // /admin/* — must have session cookie
  if (pathname.startsWith("/admin")) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL(`/login?from=${pathname}`, request.url));
    }
  }

  // /dashboard/* — must have session cookie
  if (pathname.startsWith("/dashboard")) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL(`/login?from=${pathname}`, request.url));
    }
  }

  // NOTE: /checkout is intentionally NOT gated — guest checkout is allowed.
  // Customer details (name, email, phone) are collected on the checkout form.

  // Stamp admin *mutations* so the Prisma audit extension (lib/audit.ts) knows
  // it is running inside an admin action and can record who changed what.
  // Covers the /api/admin/* routes and the server actions that POST back to an
  // /admin/* page (role changes on /admin/settings/users, for one). Plain GET
  // page renders are left unstamped so incidental writes (view counters) stay
  // out of the log. This is NOT a gate — each route still does its own role
  // check, and lib/audit.ts re-verifies the session before writing a log row.
  if (pathname.startsWith("/api/admin") || (pathname.startsWith("/admin") && request.method !== "GET")) {
    const headers = new Headers(request.headers);
    headers.set("x-audit-path", pathname);
    headers.set("x-audit-method", request.method);
    return NextResponse.next({ request: { headers } });
  }

  // Anywhere else, drop a client-supplied x-audit-* header so nobody can forge
  // an activity-log entry from an ordinary storefront request.
  if (request.headers.has("x-audit-path")) {
    const headers = new Headers(request.headers);
    headers.delete("x-audit-path");
    headers.delete("x-audit-method");
    return NextResponse.next({ request: { headers } });
  }

  return NextResponse.next();
}

export const config = {
  // The catch-all entry exists so the x-audit-* strip above sees every request.
  // Anything that is a plain file — build output, images, fonts, sitemap — is
  // excluded: middleware runs in the Node server on App Platform, so invoking it
  // per static asset added latency to every page for no gain (a static file
  // never reaches Prisma, so it cannot forge an audit-log entry either).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:png|jpe?g|gif|webp|avif|svg|ico|css|js|mjs|map|woff2?|ttf|otf|txt|xml|json|pdf|mp4|webm)$).*)",
  ],
};
