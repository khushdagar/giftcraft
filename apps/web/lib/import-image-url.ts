import dns from 'node:dns/promises';
import net from 'node:net';
import { uploadToDigitalOcean } from './upload-to-digital-ocean';

/**
 * Turn an image URL written in a bulk-upload sheet into a permanent URL on our
 * own CDN.
 *
 * Sheets in practice carry Google Drive share links, not direct image URLs. A
 * Drive `/file/d/<id>/view` link is an HTML page, so storing it verbatim gives a
 * broken image and — worse — leaves the asset living on someone's Drive forever.
 * So anything that is not already ours is downloaded and pushed through the same
 * uploadToDigitalOcean() pipeline as a manual upload (WebP + variants + blur).
 *
 * Supported link shapes:
 *   https://drive.google.com/file/d/<id>/view?usp=sharing
 *   https://drive.google.com/open?id=<id>   ·   /uc?id=<id>&export=download
 *   https://drive.usercontent.google.com/download?id=<id>
 *   https://lh3.googleusercontent.com/d/<id>
 *   https://drive.google.com/drive/folders/<id>   every image inside it, by name
 *   https://www.dropbox.com/s/…?dl=0        (rewritten to a direct download)
 *   any other public direct image URL
 *
 * The Drive file must be shared as "Anyone with the link" — a private file
 * returns Google's sign-in page, which is reported as such rather than stored.
 */

const MAX_BYTES = 15 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 30_000;
const MAX_REDIRECTS = 5;

/** Hosts that are already ours — no point mirroring them onto themselves. */
function isOurHost(hostname: string): boolean {
  if (/(^|\.)digitaloceanspaces\.com$/i.test(hostname)) return true;
  const cdn = process.env.DO_SPACES_CDN_ENDPOINT;
  if (cdn) {
    try {
      if (new URL(cdn).hostname.toLowerCase() === hostname.toLowerCase()) return true;
    } catch {
      /* malformed env — fall through */
    }
  }
  return false;
}

/** Extract a Google Drive file id from any of its many link shapes. */
function driveFileId(u: URL): string | null {
  if (!/(^|\.)google\.com$|(^|\.)googleusercontent\.com$/i.test(u.hostname)) return null;

  // Folder links carry no file id — driveFolderId()/listDriveFolder() handle them.
  if (/\/(folders|folderview)/i.test(u.pathname) || u.searchParams.has('folderid')) return null;

  const byId = u.searchParams.get('id');
  if (byId && /^[a-zA-Z0-9_-]{10,}$/.test(byId)) return byId;

  const m = u.pathname.match(/\/(?:file\/)?d\/([a-zA-Z0-9_-]{10,})/);
  return m?.[1] ?? null;
}

/** A Drive folder share link, and the folder id inside it. */
function driveFolderId(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (!/(^|\.)google\.com$/i.test(u.hostname)) return null;

  const m = u.pathname.match(/\/folders\/([a-zA-Z0-9_-]{10,})/);
  if (m?.[1]) return m[1];

  // Legacy /folderview?id=… carries the id in the query instead. (/open?id= is
  // NOT treated as a folder — it is overwhelmingly a file link.)
  if (/\/folderview/i.test(u.pathname)) {
    const id = u.searchParams.get('id');
    if (id && /^[a-zA-Z0-9_-]{10,}$/.test(id)) return id;
  }
  return null;
}

/** Rewrite known share links to their direct-download equivalent. */
function toDirectUrl(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error(`Not a valid URL: ${raw}`);
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error(`Only http/https image links are supported: ${raw}`);
  }

  const id = driveFileId(u);
  if (id) return `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;

  if (/(^|\.)dropbox\.com$/i.test(u.hostname)) {
    u.searchParams.delete('dl');
    u.searchParams.set('raw', '1');
    return u.toString();
  }

  return u.toString();
}

/** Reject loopback / link-local / private addresses — no SSRF via a sheet cell. */
function isPrivateAddress(addr: string): boolean {
  if (net.isIPv4(addr)) {
    const [a = 0, b = 0] = addr.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true;
    return false;
  }
  const v6 = addr.toLowerCase();
  if (v6 === '::1' || v6 === '::') return true;
  if (/^f[cd]/.test(v6) || v6.startsWith('fe80')) return true;
  // IPv4-mapped (::ffff:10.0.0.1)
  const mapped = v6.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped?.[1] ? isPrivateAddress(mapped[1]) : false;
}

async function assertPublicHost(u: URL): Promise<void> {
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) {
    throw new Error(`Refusing to fetch a private address: ${host}`);
  }
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) throw new Error(`Refusing to fetch a private address: ${host}`);
    return;
  }
  const records = await dns.lookup(host, { all: true }).catch(() => []);
  if (records.some((rec) => isPrivateAddress(rec.address))) {
    throw new Error(`Refusing to fetch a private address: ${host}`);
  }
}

/**
 * GET a URL, following redirects one hop at a time so every hop is re-checked
 * against the private-address guard (fetch's own redirect handling would not be).
 */
async function safeFetch(startUrl: string): Promise<Response> {
  let target = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const u = new URL(target);
    await assertPublicHost(u);
    const res = await fetch(u, {
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        // Drive serves the interstitial rather than the file to unknown clients.
        'User-Agent': 'Mozilla/5.0 (compatible; GivooImporter/1.0)',
        Accept: 'image/*,*/*;q=0.8',
      },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) throw new Error(`Redirect without a location (HTTP ${res.status})`);
      target = new URL(loc, u).toString();
      continue;
    }
    return res;
  }
  throw new Error('Too many redirects');
}

const isHtml = (res: Response) => /text\/html|application\/xhtml/i.test(res.headers.get('content-type') || '');

/** Fetch the bytes for one already-direct URL, handling Drive's interstitials. */
async function fetchImageBytes(directUrl: string): Promise<{ data: Buffer; contentType: string }> {
  let res = await safeFetch(directUrl);

  // Drive answers large files with a "can't scan for viruses" confirmation page
  // that carries a uuid to echo back; a private file gets the sign-in page.
  if (isHtml(res) && /drive\.usercontent\.google\.com/i.test(directUrl)) {
    const html = await res.text();
    const uuid = html.match(/name="uuid"\s+value="([^"]+)"/i)?.[1];
    if (!uuid) {
      throw new Error(
        'Google Drive did not return the file — set the link sharing to "Anyone with the link" (Viewer)',
      );
    }
    res = await safeFetch(`${directUrl}&uuid=${encodeURIComponent(uuid)}`);
  }

  if (!res.ok) throw new Error(`Download failed (HTTP ${res.status})`);
  if (isHtml(res)) {
    throw new Error('Link returned a web page, not an image file — is it shared publicly?');
  }

  const declared = Number(res.headers.get('content-length') || 0);
  if (declared > MAX_BYTES) {
    throw new Error(`Image is larger than ${Math.round(MAX_BYTES / 1024 / 1024)}MB`);
  }

  const data = Buffer.from(await res.arrayBuffer());
  if (!data.length) throw new Error('Downloaded file is empty');
  if (data.length > MAX_BYTES) {
    throw new Error(`Image is larger than ${Math.round(MAX_BYTES / 1024 / 1024)}MB`);
  }

  return { data, contentType: res.headers.get('content-type') || 'application/octet-stream' };
}

/** Best-effort filename for the upload key — cosmetic only. */
function fileNameFor(directUrl: string, contentType: string, index: number): string {
  const ext = /png/i.test(contentType)
    ? 'png'
    : /webp/i.test(contentType)
      ? 'webp'
      : /avif/i.test(contentType)
        ? 'avif'
        : /gif/i.test(contentType)
          ? 'gif'
          : 'jpg';
  try {
    const last = new URL(directUrl).pathname.split('/').filter(Boolean).pop() || '';
    const stem = decodeURIComponent(last).replace(/\.[a-z0-9]+$/i, '');
    if (stem && !/^download$/i.test(stem)) return `${stem}.${ext}`;
  } catch {
    /* fall through to the generic name */
  }
  return `sheet-image-${index + 1}.${ext}`;
}

/** Hard cap on how many images one folder link may contribute to one row. */
const MAX_FILES_PER_FOLDER = 12;

interface DriveFile {
  id: string;
  name: string;
}

/**
 * List the image files inside a public Drive folder, ordered by filename.
 *
 * A folder share link carries only the folder id, so the contents have to be
 * asked for. Two ways, tried in order:
 *
 *  1. Drive API v3 `files.list` — used only when GOOGLE_API_KEY is set (a free
 *     unrestricted browser key is enough; the folder must still be public).
 *  2. The `embeddedfolderview` HTML endpoint — needs no key at all, so this is
 *     the path that runs by default. See listDriveFolderViaEmbed().
 *
 * If the API path errors for any reason we fall through to (2) rather than
 * failing the row — a stale or over-restricted key shouldn't cost you images.
 */
async function listDriveFolder(folderId: string): Promise<DriveFile[]> {
  const key = process.env.GOOGLE_API_KEY || process.env.GOOGLE_DRIVE_API_KEY;

  if (key) {
    try {
      return await listDriveFolderViaApi(folderId, key);
    } catch (err) {
      console.error('[Import] Drive API folder listing failed, falling back to embed view:', err);
    }
  }

  return listDriveFolderViaEmbed(folderId);
}

async function listDriveFolderViaApi(folderId: string, key: string): Promise<DriveFile[]> {
  {
    const api = new URL('https://www.googleapis.com/drive/v3/files');
    api.searchParams.set('q', `'${folderId}' in parents and trashed = false`);
    api.searchParams.set('fields', 'files(id,name,mimeType)');
    api.searchParams.set('orderBy', 'name');
    api.searchParams.set('pageSize', '1000');
    api.searchParams.set('supportsAllDrives', 'true');
    api.searchParams.set('includeItemsFromAllDrives', 'true');
    api.searchParams.set('key', key);

    const res = await safeFetch(api.toString());
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const reason = (body as any)?.error?.message || `HTTP ${res.status}`;
      throw new Error(`Drive folder could not be read (${reason}) — is it shared with "Anyone with the link"?`);
    }
    const files = ((body as any)?.files ?? []) as { id: string; name: string; mimeType: string }[];
    const images = files
      .filter((f) => /^image\//i.test(f.mimeType))
      .map((f) => ({ id: f.id, name: f.name }));
    if (!images.length) throw new Error('Drive folder contains no image files');
    // Numeric-aware, so 2.png sorts before 10.png as it does in the embed path.
    return images.sort((a, b) => compareFileNames(a.name, b.name));
  }
}

/**
 * Keyless folder listing via Drive's `embeddedfolderview` endpoint — the one
 * built for embedding a public folder in an <iframe>. It returns small, plain,
 * server-rendered HTML (no JS needed), one block per file:
 *
 *   <div class="flip-entry" id="entry-<FILE_ID>"> … <img src="…/type/image/png">
 *     … <div class="flip-entry-title">01.png</div>
 *
 * The main /drive/folders/ page is useless here by comparison: it renders its
 * file list client-side, so a plain fetch comes back with no entries at all.
 */
async function listDriveFolderViaEmbed(folderId: string): Promise<DriveFile[]> {
  const res = await safeFetch(`https://drive.google.com/embeddedfolderview?id=${folderId}#list`);
  if (!res.ok) throw new Error(`Drive folder view returned HTTP ${res.status}`);
  const html = await res.text();

  const ENTRY = /id="entry-([a-zA-Z0-9_-]{20,})"([\s\S]{0,4000}?)flip-entry-title">([^<]*)</g;

  const seen = new Set<string>();
  const files: DriveFile[] = [];
  let m: RegExpExecArray | null;
  while ((m = ENTRY.exec(html))) {
    const [, id, chunk = '', rawName = ''] = m;
    if (!id || id === folderId || seen.has(id)) continue;
    const name = decodeHtml(rawName).trim();
    // Keep images only — a folder may also hold PDFs, sub-folders, source files.
    const isImage = /\/type\/image\//i.test(chunk) || IMAGE_EXT.test(name);
    if (!isImage) continue;
    seen.add(id);
    files.push({ id, name: name || id });
  }

  if (!files.length) {
    throw new Error(
      'No images found in the Drive folder — share it with "Anyone with the link" (Viewer), and check it holds image files',
    );
  }
  // Numeric-aware so 2.png sorts before 10.png; first one becomes the cover.
  return files.sort((a, b) => compareFileNames(a.name, b.name));
}

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif)$/i;

/**
 * Order files the way a human names them, so the first one is the right cover.
 *
 * Folders in practice hold `01.png, 01.1.png, 02.png, 02.1.png` — a main shot
 * plus alternates. Plain localeCompare puts `01.1.png` first (digit before
 * letter), which would make the alternate the cover. So each dot-segment is
 * compared as a number where it is one, with a missing segment counting as 0 —
 * `01` sorts ahead of `01.1`, and `2` ahead of `10`.
 */
function compareFileNames(a: string, b: string): number {
  const parts = (n: string) =>
    n.replace(IMAGE_EXT, '').split('.').map((p) => (/^\d+$/.test(p) ? Number(p) : p));
  const pa = parts(a);
  const pb = parts(b);

  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x === y) continue;
    if (typeof x === 'number' && typeof y === 'number') return x - y;
    return String(x).localeCompare(String(y), 'en', { numeric: true });
  }
  return a.localeCompare(b, 'en', { numeric: true });
}

const decodeHtml = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));

/**
 * Mirror one sheet URL onto our CDN and return the new URL. URLs already on our
 * own Spaces/CDN are returned unchanged. Throws a human-readable Error the
 * importer can surface as a per-row warning.
 */
export async function mirrorImageUrl(raw: string, folder = 'products', index = 0): Promise<string> {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('Empty image URL');

  try {
    if (isOurHost(new URL(trimmed).hostname)) return trimmed;
  } catch {
    /* toDirectUrl reports the malformed URL below */
  }

  const directUrl = toDirectUrl(trimmed);
  const { data, contentType } = await fetchImageBytes(directUrl);
  const file = new File([new Uint8Array(data)], fileNameFor(directUrl, contentType, index), {
    type: contentType,
  });
  return uploadToDigitalOcean(file, folder);
}

export interface MirrorResult {
  /** CDN URLs, in sheet order, for the links that came through. */
  urls: string[];
  /** One human-readable line per link that did not, for the import report. */
  warnings: string[];
}

/**
 * Mirror every URL in one sheet cell. A link that fails is skipped with a
 * warning rather than failing the whole row — the product still gets created,
 * and the admin can fix the link or attach the image by hand afterwards.
 */
export async function mirrorImageUrls(
  raws: string[],
  folder = 'products',
  onProgress?: (done: number, total: number) => void,
): Promise<MirrorResult> {
  const urls: string[] = [];
  const warnings: string[] = [];

  const label = (raw: string) => (raw.length > 80 ? `${raw.slice(0, 77)}…` : raw);

  // A folder link stands for every image inside it, so expand those first and
  // treat the result as extra entries in the same cell.
  const targets: { raw: string; url: string }[] = [];
  for (const raw of raws) {
    const trimmed = (raw ?? '').trim();
    if (!trimmed) continue;

    const folderId = driveFolderId(trimmed);
    if (!folderId) {
      targets.push({ raw: trimmed, url: trimmed });
      continue;
    }
    try {
      const files = await listDriveFolder(folderId);
      if (files.length > MAX_FILES_PER_FOLDER) {
        warnings.push(
          `${label(trimmed)} — folder has ${files.length} images; only the first ${MAX_FILES_PER_FOLDER} (by filename) were imported`,
        );
      }
      for (const file of files.slice(0, MAX_FILES_PER_FOLDER)) {
        targets.push({
          raw: `${file.name} (in folder)`,
          url: `https://drive.google.com/file/d/${file.id}/view`,
        });
      }
    } catch (err) {
      warnings.push(`${label(trimmed)} — ${err instanceof Error ? err.message : 'folder could not be read'}`);
    }
  }

  // Folder links only reveal how many images they hold once expanded, so report
  // the real total before the first download rather than counting cells.
  onProgress?.(0, targets.length);

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]!;
    try {
      urls.push(await mirrorImageUrl(target.url, folder, i));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Image download failed';
      warnings.push(`${label(target.raw)} — ${message}`);
    }
    onProgress?.(i + 1, targets.length);
  }

  return { urls, warnings };
}
