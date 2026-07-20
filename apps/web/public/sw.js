/* GiftCraft Web Push service worker.
 * Receives push messages and shows a notification; focuses/opens the target
 * URL on click. Payload shape (sent from lib/push.ts):
 *   { title, body, url?, tag? }
 */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'GiftCraft', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'GiftCraft';
  const options = {
    body: data.body || '',
    tag: data.tag || undefined,
    data: { url: data.url || '/' },
    // renotify only matters when a tag is set; harmless otherwise.
    renotify: Boolean(data.tag),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a tab for this origin is already open, focus it and navigate.
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client) {
              try {
                client.navigate(targetUrl);
              } catch (e) {
                /* cross-origin navigate can throw; ignore */
              }
            }
            return;
          }
        }
        // Otherwise open a new window.
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// Activate immediately on update so a new SW controls pages without a reload.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
