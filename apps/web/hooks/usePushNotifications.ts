'use client';

import { useCallback, useEffect, useState } from 'react';

export type PushStatus =
  | 'loading' // still checking current state
  | 'unsupported' // browser can't do web push
  | 'default' // supported, not subscribed, permission not decided
  | 'denied' // user blocked notifications at the browser level
  | 'subscribed'; // active subscription saved

/** Convert a base64url VAPID public key to the Uint8Array the Push API wants. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>('loading');
  const [busy, setBusy] = useState(false);

  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  // Determine current subscription state on mount.
  useEffect(() => {
    if (!supported) {
      setStatus('unsupported');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const existing = reg ? await reg.pushManager.getSubscription() : null;
        if (cancelled) return;
        if (existing) setStatus('subscribed');
        else setStatus(Notification.permission === 'denied' ? 'denied' : 'default');
      } catch {
        if (!cancelled) setStatus('default');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!supported || busy) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'default');
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.error('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set');
        setStatus('default');
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast: TS 5.7+ types Uint8Array as generic over its buffer; the Push
        // API wants a plain BufferSource.
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });
      if (!res.ok) throw new Error('Failed to persist subscription');

      setStatus('subscribed');
    } catch (err) {
      console.error('[push] subscribe failed', err);
      setStatus('default');
    } finally {
      setBusy(false);
    }
  }, [supported, busy]);

  const unsubscribe = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      setStatus('default');
    } catch (err) {
      console.error('[push] unsubscribe failed', err);
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const sendTest = useCallback(async () => {
    try {
      await fetch('/api/push/test', { method: 'POST' });
    } catch (err) {
      console.error('[push] test send failed', err);
    }
  }, []);

  return { status, supported, busy, subscribe, unsubscribe, sendTest };
}
