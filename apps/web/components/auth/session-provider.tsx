"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import type { ReactNode } from "react";
import { CartSessionGuard } from "./cart-session-guard";

interface Props {
  children: ReactNode;
  session?: Session | null;
}

export function SessionProvider({ children, session }: Props) {
  return (
    <NextAuthSessionProvider session={session} refetchOnWindowFocus={false}>
      {/* Ties the locally-persisted pack/cart to the signed-in account, so a
          second account on the same browser never inherits the first's. */}
      <CartSessionGuard />
      {children}
    </NextAuthSessionProvider>
  );
}
