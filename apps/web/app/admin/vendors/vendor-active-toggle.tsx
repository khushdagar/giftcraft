'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function VendorActiveToggle({
  vendorId,
  initialActive,
}: {
  vendorId: string;
  initialActive: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    const next = !active;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || 'Failed to update vendor');
        return;
      }
      setActive(next);
      toast.success(next ? 'Vendor activated' : 'Vendor deactivated');
      startTransition(() => router.refresh());
    } catch {
      toast.error('Failed to update vendor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving || pending}
      aria-pressed={active}
      title={active ? 'Click to deactivate' : 'Click to activate'}
      className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
        active
          ? 'border-em-100 bg-em-50 text-em-700 hover:bg-em-100'
          : 'border-bdr bg-gray-50 text-ink-2 hover:bg-gray-100'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${active ? 'bg-em' : 'bg-ink-3'}`} />
      {saving ? '…' : active ? 'Active' : 'Inactive'}
    </button>
  );
}
