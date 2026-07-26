'use client';

import { useCallback, useRef, useState } from 'react';
import imageCompression from 'browser-image-compression';

/**
 * Client-side image compression + upload.
 *
 * The browser shrinks the image (off the main thread, via a web worker) before
 * it ever leaves the device, then uploads with progress reporting. The server
 * pipeline is still the source of truth — if compression fails here we fall
 * back to uploading the original and let the server process it.
 */

const MAX_DIMENSION = 2000; // long edge, matches server IMAGE_MAX_WIDTH default
const TARGET_MB = 1;

export type UploadPhase = 'idle' | 'compressing' | 'uploading' | 'done' | 'error';

export interface UploadResult {
  url: string;
  fileName?: string;
  [key: string]: unknown;
}

export interface CompressAndUploadOptions {
  folder?: string;
  endpoint?: string;
  /** FormData field name for the file (defaults to "file"). */
  fieldName?: string;
  onPhase?: (phase: UploadPhase) => void;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/** Compress a single image in the browser. Returns the original on any failure. */
export async function compressImageFile(file: File): Promise<File> {
  // Only attempt compression on raster images the library can decode. HEIC is
  // left for the server (browser-image-compression can't decode it reliably).
  if (!file.type.startsWith('image/') || /heic|heif/i.test(file.type)) {
    return file;
  }
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: TARGET_MB,
      maxWidthOrHeight: MAX_DIMENSION,
      useWebWorker: true,
      preserveExif: false,
    });
    // If the library somehow produced a larger file, keep the original.
    return compressed.size < file.size ? compressed : file;
  } catch (err) {
    console.warn('[upload] client compression failed, uploading original:', err);
    return file;
  }
}

/**
 * Compress then upload a single image via XHR (so we get real upload progress).
 * Resolves with the parsed JSON response; throws Error on non-2xx.
 */
export async function compressAndUpload(
  file: File,
  options: CompressAndUploadOptions = {},
): Promise<UploadResult> {
  const {
    folder = 'uploads',
    endpoint = '/api/upload',
    fieldName = 'file',
    onPhase,
    onProgress,
    signal,
  } = options;

  onPhase?.('compressing');
  const toSend = await compressImageFile(file);

  onPhase?.('uploading');
  const fd = new FormData();
  fd.append(fieldName, toSend, file.name);
  fd.append('folder', folder);

  const result = await new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: any = {};
      try {
        body = JSON.parse(xhr.responseText || '{}');
      } catch {
        /* non-JSON response */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.url) {
        resolve(body as UploadResult);
      } else {
        reject(new Error(body.error || `Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'));

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    xhr.send(fd);
  });

  onPhase?.('done');
  return result;
}

export interface UseCompressedUploadReturn {
  upload: (file: File, options?: CompressAndUploadOptions) => Promise<UploadResult>;
  phase: UploadPhase;
  progress: number;
  error: string | null;
  isBusy: boolean;
  reset: () => void;
}

/** React hook wrapping {@link compressAndUpload} with phase/progress state. */
export function useCompressedUpload(): UseCompressedUploadReturn {
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase('idle');
    setProgress(0);
    setError(null);
  }, []);

  const upload = useCallback(
    async (file: File, options: CompressAndUploadOptions = {}): Promise<UploadResult> => {
      setError(null);
      setProgress(0);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        return await compressAndUpload(file, {
          ...options,
          signal: options.signal ?? controller.signal,
          onPhase: (p) => {
            setPhase(p);
            options.onPhase?.(p);
          },
          onProgress: (p) => {
            setProgress(p);
            options.onProgress?.(p);
          },
        });
      } catch (err) {
        setPhase('error');
        setError(err instanceof Error ? err.message : 'Upload failed');
        throw err;
      }
    },
    [],
  );

  const isBusy = phase === 'compressing' || phase === 'uploading';
  return { upload, phase, progress, error, isBusy, reset };
}
