'use client';

import { Bell } from 'lucide-react';
import { PushToggle } from '@/components/notifications/push-toggle';

/**
 * Admin-side opt-in for desktop push alerts (new orders, disputes, revision
 * requests). Styled to match the calm admin cards, not the vibrant customer UI.
 * Admin pushes are not preference-gated, so no onSubscribedChange is needed.
 */
export function AdminPushCard() {
  return (
    <div className="rounded-md border-2 border-bdr bg-white p-6">
      <div className="flex items-start justify-between mb-3">
        <Bell className="h-6 w-6 text-em-400" />
      </div>
      <h3 className="font-normal text-ink text-lg mb-1">Desktop Alerts</h3>
      <p className="text-sm text-ink-2 mb-2">
        Get browser push notifications for new orders, disputes, and revision requests —
        even when this tab is in the background.
      </p>
      <div className="border-t border-bdr">
        <PushToggle />
      </div>
    </div>
  );
}
