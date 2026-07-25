'use client';

import { useTopLoading } from '@/components/ui/top-loading-bar';

// Route fallback: show only the global top loading bar (no spinner).
export default function BuilderLoading() {
  useTopLoading(true);
  return null;
}
