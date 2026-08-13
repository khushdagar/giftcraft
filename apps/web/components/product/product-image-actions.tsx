'use client';

import { useEffect, useState } from 'react';
import { Heart, Share2 } from 'lucide-react';
import { useWishlistStore } from '@/store/wishlist';
import { toast } from '@/lib/stores/toast-store';

interface ProductImageActionsProps {
  productId: string;
  name: string;
  slug: string;
  image?: string;
}

// Save + share controls floating over the top-right of the main product image.
export function ProductImageActions({ productId, name, slug, image }: ProductImageActionsProps) {
  // The wishlist is localStorage-backed, so the server renders an empty list.
  // Wait for hydration before reflecting saved state to avoid a mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const items = useWishlistStore((s) => s.items);
  const toggle = useWishlistStore((s) => s.toggle);
  const saved = mounted && items.some((i) => i.id === productId);

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle({ id: productId, name, slug, image });
    toast.success(saved ? `Removed ${name} from saved` : `Saved ${name}`);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/products/${slug}`;
    const payload = { title: name, text: `Check out ${name} on GIVOO`, url };
    try {
      // Native share sheet on mobile; clipboard everywhere else.
      if (navigator.share && (!navigator.canShare || navigator.canShare(payload))) {
        await navigator.share(payload);
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success('Product link copied to clipboard');
    } catch (err) {
      // Dismissing the native share sheet rejects with AbortError — not an error.
      if ((err as Error)?.name === 'AbortError') return;
      toast.error('Could not share this product');
    }
  };

  const btn =
    'flex h-9 w-9 items-center justify-center rounded-full border border-bdr bg-white/90 shadow-sm backdrop-blur transition hover:bg-white';

  return (
    <div className="absolute right-3 top-3 z-20 flex gap-2">
      <button
        type="button"
        onClick={handleWishlist}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${name} from saved products` : `Save ${name}`}
        className={btn}
      >
        <Heart
          className={`h-4 w-4 transition ${saved ? 'fill-em text-em' : 'text-ink'}`}
        />
      </button>
      <button type="button" onClick={handleShare} aria-label={`Share ${name}`} className={btn}>
        <Share2 className="h-4 w-4 text-ink" />
      </button>
    </div>
  );
}
