import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple middleware that just redirects to login if no session cookie exists
// Session verification happens server-side in pages (cannot use Prisma in Edge Runtime)
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if authjs session cookie exists
  const sessionCookie = request.cookies.get("authjs.session-token")?.value;

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

  // /checkout/* — must have session cookie
  if (pathname.startsWith("/checkout")) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL(`/login?from=${pathname}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/checkout/:path*"],
};
