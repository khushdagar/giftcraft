import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple middleware that just redirects to login if no session cookie exists
// Session verification happens server-side in pages (cannot use Prisma in Edge Runtime)
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  // The catch-all entry exists so the x-audit-* strip above sees every request;
  // static assets and image optimisation are skipped.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
