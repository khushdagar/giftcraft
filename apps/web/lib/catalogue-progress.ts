/**
 * In-memory progress of catalogue PDF renders, keyed by a token the browser
 * makes up and passes as ?progress=<token>. The admin polls it to draw the
 * download bar. One container, short-lived entries — no need for Redis.
 *
 * Kept on globalThis because each route handler can get its own copy of a
 * module, and the PDF route writes what the progress route reads.
 */

export type CatalogueProgressStage = 'queued' | 'images' | 'layout' | 'done';

export interface CatalogueProgress {
  /** 0–90. The last 10% is the browser receiving the file. */
  pct: number;
  stage: CatalogueProgressStage;
  at: number;
}

export type ProgressReporter = (stage: CatalogueProgressStage, pct: number) => void;

const store = ((globalThis as unknown as { catalogueProgress?: Map<string, CatalogueProgress> })
  .catalogueProgress ??= new Map<string, CatalogueProgress>());

const TTL_MS = 10 * 60 * 1000;

export function isProgressToken(token: string | null): token is string {
  return !!token && /^[A-Za-z0-9-]{8,64}$/.test(token);
}

export function progressReporter(token: string): ProgressReporter {
  return (stage, pct) => {
    const now = Date.now();
    for (const [key, value] of store) if (now - value.at > TTL_MS) store.delete(key);
    store.set(token, { stage, pct: Math.round(pct), at: now });
  };
}

export function readProgress(token: string): CatalogueProgress | null {
  return store.get(token) ?? null;
}

export function clearProgress(token: string) {
  store.delete(token);
}
