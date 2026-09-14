/**
 * Helpers for downloading AI pack images. CDN files are cross-origin, so a
 * plain <a download> would just open them — they go through the admin proxy
 * route, which returns them as an attachment.
 */

export function generatedImageDownloadUrl(url: string, name: string): string {
  return `/api/admin/generated-images/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`;
}

/** Start a browser download (client-side only). */
export function triggerDownload(href: string, filename?: string): void {
  const a = document.createElement('a');
  a.href = href;
  if (filename) a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Browsers drop back-to-back downloads, so each image waits its turn. */
export function downloadImagesStaggered(images: { url: string; label: string }[], delayMs = 500): void {
  images.forEach((img, i) => {
    setTimeout(() => triggerDownload(generatedImageDownloadUrl(img.url, img.label)), delayMs * (i + 1));
  });
}
