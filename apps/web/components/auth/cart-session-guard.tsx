'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { useBuilderStore } from '@/store/builder';
import { useBoxStore } from '@/store/box';
import { useCartStore } from '@/store/cart';
import { useWishlistStore } from '@/store/wishlist';
import { useCompareStore } from '@/store/compare';
import { useRecentlyViewedStore } from '@/store/recently-viewed';

/**
 * Which account the shopping state on this device belongs to.
 *
 * The gift pack, box planner, cart and wishlist are all persisted to
 * localStorage, which is scoped to the BROWSER and not to the signed-in user.
 * Left alone, that means whoever signs in next on this machine inherits the
 * previous account's pack — someone else's products, prices and quantities.
 */
const OWNER_KEY = 'giftcraft-cart-owner';

function readOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

function writeOwner(userId: string | null) {
  try {
    if (userId) localStorage.setItem(OWNER_KEY, userId);
    else localStorage.removeItem(OWNER_KEY);
  } catch {
    // Private mode / storage disabled — nothing persisted, nothing to scope.
  }
}

/**
 * Empty every store that holds what the shopper picked. Cleared through the
 * stores' own actions rather than by deleting the localStorage keys, so the
 * in-memory state updates too and open tabs re-render immediately.
 */
function clearShoppingState() {
  useBuilderStore.getState().clearAll(); // also empties the /box planner's products
  useBoxStore.getState().reset();
  useCartStore.getState().clearCart();
  useWishlistStore.getState().clear();
  useCompareStore.getState().clear();
  useRecentlyViewedStore.getState().clear();
}

/**
 * Keeps the locally-persisted pack tied to the account that built it: adopts a
 * guest's pack when they sign in, and wipes it when the account changes or
 * signs out.
 */
export function CartSessionGuard() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    // 'loading' means the session isn't resolved yet — acting on it would read
    // a signed-in user as a guest and wrongly bin their pack.
    if (status === 'loading') return;

    const owner = readOwner();

    if (status === 'authenticated' && userId) {
      // Same person as last time — leave their pack exactly as they left it.
      if (owner === userId) return;

      if (owner !== null) {
        // A DIFFERENT account is now signed in on this browser. Everything on
        // disk belongs to the previous one.
        clearShoppingState();
        queryClient.clear();
      }
      // owner === null → a guest built this pack and has just signed in. It IS
      // theirs, so adopt it instead of throwing their work away at the door.
      writeOwner(userId);
      return;
    }

    if (status === 'unauthenticated' && owner !== null) {
      // Signed out, or the session expired. The pack left behind belongs to
      // that account and must not greet whoever signs in next.
      clearShoppingState();
      queryClient.clear();
      writeOwner(null);
    }
  }, [status, userId, queryClient]);

  return null;
}
