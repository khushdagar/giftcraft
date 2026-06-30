/**
 * Heuristic: does this URL point directly at an image we can render inline?
 *
 * Mockups can be sent two ways:
 *   1. An uploaded image (DO Spaces) — a direct image URL with an extension.
 *   2. A pasted share link (Google Drive, Dropbox, WeTransfer…) — NOT a direct
 *      image, so it must be shown as a clickable link, not an <img>/<Image>.
 *
 * We treat a URL as an image only when its path ends in a known image
 * extension (ignoring any query string or hash).
 */
export function isImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(png|jpe?g|gif|webp|svg|avif|bmp|tiff?)(\?|#|$)/i.test(url);
}
