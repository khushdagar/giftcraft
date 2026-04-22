"use client";

import { useSession } from "next-auth/react";

export function usePermissions() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;

  return {
    loading: status === "loading",
    isAuthenticated: !!session,
    role: role ?? null,
    isAdmin: role === "super_admin",
    isCompanyAdmin: role === "company_admin",
    isCompanyMember: role === "company_member",
    isVendor: role === "vendor",
    isReseller: role === "reseller",

    canManageProducts: role === "super_admin",
    canPlaceOrders: ["super_admin", "company_admin", "company_member"].includes(role ?? ""),
    canApproveOrders: ["super_admin", "company_admin"].includes(role ?? ""),
    canManageTeam: ["super_admin", "company_admin"].includes(role ?? ""),

    companyId: session?.user?.companyId ?? null,
    userId: session?.user?.id ?? null,
    email: session?.user?.email ?? null,
    name: session?.user?.name ?? null,
    image: session?.user?.image ?? null,
  };
}
