"use client";

import type { ReactNode } from "react";
import { usePermissions } from "@/hooks/use-permissions";

type Permission =
  | "isAdmin"
  | "isCompanyAdmin"
  | "isCompanyMember"
  | "isVendor"
  | "isReseller"
  | "isAuthenticated"
  | "canManageProducts"
  | "canPlaceOrders"
  | "canApproveOrders"
  | "canManageTeam";

interface Props {
  requires: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Declarative client-side guard. Renders children only if the given
 * permission resolves true. Note: this is UX only — server-side enforcement
 * still happens via middleware + API auth checks.
 */
export function PermissionGate({ requires, children, fallback = null }: Props) {
  const perms = usePermissions();
  if (perms.loading) return null;
  const ok = perms[requires];
  return ok ? <>{children}</> : <>{fallback}</>;
}
