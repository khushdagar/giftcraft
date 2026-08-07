import { inflateRawSync } from 'zlib';

/**
 * Minimal ZIP reader for the bulk-image uploader.
 *
 * Only the two compression methods a normal archiver produces are supported —
 * 0 (stored) and 8 (deflate) — which covers Windows "Send to > Compressed
 * folder", macOS "Compress", 7-Zip and WinRAR at default settings. Anything
 * else (bzip2, LZMA, encrypted) is reported per-entry rather than failing the
 * whole upload, so one odd file can't cost the user a 300-image run.
 *
 * Reads the central directory rather than scanning local headers, so entries
 * with streamed sizes (bit-3 data descriptors) still resolve correctly.
 */

export interface ZipEntry {
  /** Full path inside the archive, e.g. "ASG-DRK-ISB-01/front.jpg" */
  path: string;
  data: Buffer;
}

export interface ZipReadResult {
  entries: ZipEntry[];
  /** Entries that could not be decompressed, with the reason. */
  skipped: { path: string; reason: string }[];
}

const EOCD_SIG = 0x06054b50;
const EOCD64_LOCATOR_SIG = 0x07064b50;
const EOCD64_SIG = 0x06064b50;
const CENTRAL_SIG = 0x02014b50;

/** Locate the End Of Central Directory record by scanning back from the tail. */
function findEocd(buf: Buffer): number {
  // The EOCD is 22 bytes plus a comment of up to 65535 bytes.
  const start = Math.max(0, buf.length - (22 + 0xffff));
  for (let i = buf.length - 22; i >= start; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) return i;
  }
  return -1;
}

export function readZip(buf: Buffer): ZipReadResult {
  const entries: ZipEntry[] = [];
  const skipped: { path: string; reason: string }[] = [];

  const eocd = findEocd(buf);
  if (eocd < 0) throw new Error('Not a valid ZIP file (no end-of-central-directory record)');

  let entryCount = buf.readUInt16LE(eocd + 10);
  let cdOffset = buf.readUInt32LE(eocd + 16);

  // ZIP64: counts/offsets of 0xffff/0xffffffff mean the real values live in the
  // ZIP64 record. Archives over 4 GB or 65535 files hit this.
  if (entryCount === 0xffff || cdOffset === 0xffffffff) {
    const locator = eocd - 20;
    if (locator >= 0 && buf.readUInt32LE(locator) === EOCD64_LOCATOR_SIG) {
      const z64 = Number(buf.readBigUInt64LE(locator + 8));
      if (buf.readUInt32LE(z64) === EOCD64_SIG) {
        entryCount = Number(buf.readBigUInt64LE(z64 + 32));
        cdOffset = Number(buf.readBigUInt64LE(z64 + 48));
      }
    }
  }

  let p = cdOffset;
  for (let i = 0; i < entryCount; i++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== CENTRAL_SIG) break;

    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const uncompSize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    // The spec mandates forward slashes, but Windows' own Compress-Archive
    // writes backslashes — normalise so callers can always split on "/".
    const path = buf.toString('utf8', p + 46, p + 46 + nameLen).replace(/\\/g, '/');

    p += 46 + nameLen + extraLen + commentLen;

    // Directory markers carry no data.
    if (path.endsWith('/')) continue;

    try {
      // The local header repeats the name/extra lengths, and its extra field
      // can differ in length from the central one — so re-read them here.
      const lhNameLen = buf.readUInt16LE(localOffset + 26);
      const lhExtraLen = buf.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + lhNameLen + lhExtraLen;
      const raw = buf.subarray(dataStart, dataStart + compSize);

      if (method === 0) {
        entries.push({ path, data: Buffer.from(raw) });
      } else if (method === 8) {
        const out = inflateRawSync(raw, { maxOutputLength: Math.max(uncompSize, 1) || undefined });
        entries.push({ path, data: out });
      } else {
        skipped.push({ path, reason: `unsupported compression method ${method}` });
      }
    } catch (err) {
      skipped.push({ path, reason: err instanceof Error ? err.message : 'could not be read' });
    }
  }

  return { entries, skipped };
}
