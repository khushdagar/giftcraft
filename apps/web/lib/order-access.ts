// Who may see an order.
//
// Orders used to be scoped to `placedById` alone. That breaks the moment a buyer
// has more than one sign-in address — the personal Google account they built the
// pack with, and the work address they typed at checkout. Both identities point
// at the same Company (see lib/company-identity.ts), so the company is the right
// unit of visibility: sign in with either address and the history is there.
//
// Falls back to the placing user when there is no company (guests, self-serve
// accounts that have never checked out), so nothing widens accidentally.

import type { Prisma } from '@prisma/client';

export interface OrderViewer {
  id: string;
  companyId?: string | null;
  role?: string | null;
}

/** `where` fragment selecting every order this viewer may read. */
export function orderScopeWhere(viewer: OrderViewer): Prisma.OrderWhereInput {
  if (viewer.companyId) {
    return { OR: [{ placedById: viewer.id }, { companyId: viewer.companyId }] };
  }
  return { placedById: viewer.id };
}

/** Ownership check for a single already-loaded order. */
export function canAccessOrder(
  order: { placedById: string | null; companyId: string | null },
  viewer: OrderViewer
): boolean {
  if (viewer.role === 'super_admin') return true;
  if (order.placedById && order.placedById === viewer.id) return true;
  return !!viewer.companyId && order.companyId === viewer.companyId;
}
