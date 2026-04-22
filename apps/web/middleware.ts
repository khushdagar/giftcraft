import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // /admin/* — must be signed in AND super_admin
  if (pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL(`/login?from=${pathname}`, req.url));
    }
    if (session.user.role !== "super_admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // /dashboard/* — must be signed in (any role)
  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      return NextResponse.redirect(new URL(`/login?from=${pathname}`, req.url));
    }
  }

  // /checkout/* — must be signed in (any role)
  if (pathname.startsWith("/checkout")) {
    if (!session) {
      return NextResponse.redirect(new URL(`/login?callbackUrl=${pathname}`, req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  // Only run middleware on protected routes; everything else is public.
  matcher: ["/admin/:path*", "/dashboard/:path*", "/checkout/:path*"],
};
