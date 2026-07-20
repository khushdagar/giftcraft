'use client';

import { usePushNotifications } from '@/hooks/usePushNotifications';

interface PushToggleProps {
  /** Called after a successful subscribe (true) or unsubscribe (false). Lets a
   *  parent sync a server-side preference flag, e.g. prefsJson.push. */
  onSubscribedChange?: (subscribed: boolean) => void;
  /** Show a "Send test" button while subscribed (default true). */
  showTest?: boolean;
}

export function PushToggle({ onSubscribedChange, showTest = true }: PushToggleProps) {
  const { status, supported, busy, subscribe, unsubscribe, sendTest } = usePushNotifications();

  const isOn = status === 'subscribed';

  const handleToggle = async () => {
    if (isOn) {
      await unsubscribe();
      onSubscribedChange?.(false);
    } else {
      await subscribe();
      // subscribe() sets status internally; treat a granted subscribe as on.
      onSubscribedChange?.(true);
    }
  };

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <label className="text-sm font-medium text-ink cursor-pointer block">
          Browser Push Notifications
        </label>
        <p className="text-xs text-ink-2 mt-1">
          {status === 'unsupported'
            ? 'Your browser does not support push notifications.'
            : status === 'denied'
            ? 'Notifications are blocked. Enable them in your browser site settings, then try again.'
            : 'Get instant alerts in this browser, even when the tab is closed.'}
        </p>
        {isOn && showTest && (
          <button
            type="button"
            onClick={sendTest}
            className="mt-2 text-xs font-medium text-em hover:underline"
          >
            Send a test notification
          </button>
        )}
      </div>
      <div className="ml-4">
        <button
          type="button"
          onClick={handleToggle}
          disabled={!supported || busy || status === 'denied' || status === 'loading'}
          aria-pressed={isOn}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            isOn ? 'bg-em' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isOn ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
