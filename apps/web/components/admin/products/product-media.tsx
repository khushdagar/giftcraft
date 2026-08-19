'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { compressAndUpload } from '@/hooks/use-compressed-upload';
import { toast } from '@/lib/stores/toast-store';
import {
  ImagePlus,
  Plus,
  Star,
  Trash2,
  GripVertical,
  Loader2,
  X,
} from 'lucide-react';
import { MediaLibraryModal } from '@/components/admin/media-library-modal';

export interface MediaImage {
  id?: string;
  url: string;
  isPrimary: boolean;
  altText?: string;
  file?: File;
}

interface PendingUpload {
  tempId: string;
  name: string;
  preview: string;
  progress: number;
  phase: 'compressing' | 'uploading' | 'error';
}

interface ProductMediaProps {
  images: MediaImage[];
  setImages: React.Dispatch<React.SetStateAction<MediaImage[]>>;
  mode: 'create' | 'edit';
  productId?: string;
  /** Index of the current primary/cover image (first flagged, else first). */
  primaryImageIdx: number;
  /** Open the zoom/details lightbox for image #idx. */
  onZoom: (idx: number) => void;
  /** Remove image #idx from the local gallery (applied on save). */
  onDelete: (idx: number) => void;
}

const MAX_MB = 5;

/**
 * Shopify-style product media manager.
 *
 * - First tile is the large "cover" (= primary). Drag any tile to the front to
 *   make it the cover.
 * - Drag-and-drop to reorder anywhere. Order is applied on save, not instantly.
 * - Live per-file upload progress bars on placeholder tiles.
 * - "Select existing" pulls from previously uploaded media so images can be
 *   reused without re-uploading.
 */
export function ProductMedia({
  images,
  setImages,
  mode,
  productId,
  primaryImageIdx,
  onZoom,
  onDelete,
}: ProductMediaProps) {
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [fileHover, setFileHover] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updatePending = useCallback((tempId: string, patch: Partial<PendingUpload>) => {
    setPending((prev) => prev.map((p) => (p.tempId === tempId ? { ...p, ...patch } : p)));
  }, []);

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const valid: File[] = [];
      for (const f of files) {
        if (!f.type.startsWith('image/')) {
          toast.error(`❌ ${f.name} is not an image`);
          continue;
        }
        if (f.size > MAX_MB * 1024 * 1024) {
          toast.error(`❌ ${f.name} exceeds ${MAX_MB}MB`);
          continue;
        }
        valid.push(f);
      }
      if (valid.length === 0) return;

      const entries: PendingUpload[] = valid.map((f, i) => ({
        tempId: `${Date.now()}-${i}-${Math.round(Math.random() * 1e6)}`,
        name: f.name,
        preview: URL.createObjectURL(f),
        progress: 0,
        phase: 'compressing',
      }));
      setPending((prev) => [...prev, ...entries]);

      const results = await Promise.allSettled(
        valid.map((f, i) =>
          compressAndUpload(f, {
            folder: 'products',
            onPhase: (ph) =>
              updatePending(entries[i]!.tempId, {
                phase: ph === 'uploading' ? 'uploading' : 'compressing',
              }),
            onProgress: (p) => updatePending(entries[i]!.tempId, { progress: p }),
          }),
        ),
      );

      const uploaded: { url: string; altText: string }[] = [];
      results.forEach((res, i) => {
        const entry = entries[i]!;
        if (res.status === 'fulfilled' && res.value?.url) {
          uploaded.push({
            url: res.value.url,
            altText: entry.name.replace(/\.[^/.]+$/, ''),
          });
        } else {
          const msg =
            res.status === 'rejected'
              ? res.reason instanceof Error
                ? res.reason.message
                : 'Upload failed'
              : 'Upload failed';
          toast.error(`❌ ${entry.name}: ${msg}`);
        }
        URL.revokeObjectURL(entry.preview);
      });

      // Clear the placeholder tiles.
      const usedIds = new Set(entries.map((e) => e.tempId));
      setPending((prev) => prev.filter((p) => !usedIds.has(p.tempId)));

      if (uploaded.length === 0) return;

      // The file is on the CDN, but the product's gallery is not touched until
      // the form is saved — editing must be reversible by simply not saving.
      setImages((prev) => [
        ...prev,
        ...uploaded.map((u, i) => ({
          url: u.url,
          altText: u.altText,
          isPrimary: prev.length === 0 && i === 0,
        })),
      ]);
      toast.success(
        mode === 'edit'
          ? `✅ ${uploaded.length} image(s) added — Save Changes to apply`
          : `✅ ${uploaded.length} image(s) added`,
      );
    },
    [mode, setImages, updatePending],
  );

  // ── Reorder ─────────────────────────────────────────────────────────────
  // Order is local state only; it reaches the database with the next save.
  const move = useCallback(
    (from: number, to: number) => {
      if (from === to || from < 0 || to < 0) return;
      setImages((prev) => {
        if (from >= prev.length || to >= prev.length) return prev;
        const arr = [...prev];
        const [moved] = arr.splice(from, 1);
        if (!moved) return prev;
        arr.splice(to, 0, moved);
        return arr.map((img, i) => ({ ...img, isPrimary: i === 0 }));
      });
    },
    [setImages],
  );

  const handleDrop = (targetIdx: number) => {
    if (dragIndex !== null) move(dragIndex, targetIdx);
    setDragIndex(null);
    setOverIndex(null);
  };

  const hasMedia = images.length > 0 || pending.length > 0;

  // ── Empty state (Shopify-style drop zone) ──────────────────────────────────
  if (!hasMedia) {
    return (
      <>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setFileHover(true);
          }}
          onDragLeave={() => setFileHover(false)}
          onDrop={(e) => {
            e.preventDefault();
            setFileHover(false);
            if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
          }}
          className={`rounded-lg border-2 border-dashed p-8 text-center transition ${
            fileHover ? 'border-blue-500 bg-blue-50/50' : 'border-gray-300'
          }`}
        >
          <ImagePlus className="mx-auto h-8 w-8 text-gray-400" />
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Upload new
            </button>
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-blue-600 hover:underline"
            >
              Select existing
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Drag &amp; drop or click — PNG, JPG, WebP up to {MAX_MB}MB each
          </p>
        </div>
        <HiddenFileInput inputRef={fileInputRef} onFiles={handleFiles} />
        {libraryOpen && (
          <MediaLibraryModal
            existing={images}
            onClose={() => setLibraryOpen(false)}
            onConfirm={(urls) => addExisting(urls, { mode, productId, images, setImages })}
          />
        )}
      </>
    );
  }

  // ── Populated grid ──────────────────────────────────────────────────────
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {images.length} image{images.length === 1 ? '' : 's'} · drag to reorder · first image is
          the cover
        </p>
        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Select existing
        </button>
      </div>

      <div
        onDragOver={(e) => {
          // Only light up for OS file drags, not internal tile reordering.
          if (e.dataTransfer.types?.includes('Files')) {
            e.preventDefault();
            setFileHover(true);
          }
        }}
        onDragLeave={() => setFileHover(false)}
        onDrop={(e) => {
          if (e.dataTransfer.files?.length) {
            e.preventDefault();
            void handleFiles(e.dataTransfer.files);
          }
          setFileHover(false);
        }}
        className={`mt-3 grid grid-cols-3 gap-3 rounded-lg sm:grid-cols-5 md:grid-cols-6 ${
          fileHover ? 'ring-2 ring-blue-400 ring-offset-2' : ''
        }`}
      >
        {images.map((img, idx) => (
          <div
            key={img.id || img.url || idx}
            draggable
            onDragStart={() => setDragIndex(idx)}
            onDragEnter={() => setOverIndex(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(idx)}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
            className={`group relative overflow-hidden rounded-lg border bg-gray-50 transition ${
              idx === 0 ? 'col-span-2 row-span-2' : ''
            } ${overIndex === idx && dragIndex !== null ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200'} ${
              dragIndex === idx ? 'opacity-40' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => onZoom(idx)}
              className="block aspect-square w-full"
              title="Click to view & edit"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.altText || `Product image ${idx + 1}`}
                className="h-full w-full object-cover"
                draggable={false}
              />
            </button>

            {/* Cover badge */}
            {idx === primaryImageIdx && (
              <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-gray-900/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                Cover
              </span>
            )}

            {/* Drag affordance */}
            <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-white/80 p-1 text-gray-500 opacity-0 transition group-hover:opacity-100">
              <GripVertical className="h-3.5 w-3.5" />
            </span>

            {/* Hover actions */}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-gradient-to-t from-black/50 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
              {idx !== 0 && (
                <button
                  type="button"
                  onClick={() => move(idx, 0)}
                  title="Set as cover"
                  className="rounded-md bg-white/90 p-1.5 text-gray-700 hover:bg-white"
                >
                  <Star className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onDelete(idx)}
                title="Remove"
                className="rounded-md bg-white/90 p-1.5 text-red-600 hover:bg-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {/* Uploading placeholder tiles with live progress */}
        {pending.map((p) => (
          <div
            key={p.tempId}
            className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
          >
            <div className="aspect-square w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt={p.name} className="h-full w-full object-cover opacity-40" />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-[10px] font-medium text-gray-600">
                {p.phase === 'compressing' ? 'Optimizing…' : `${p.progress}%`}
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gray-200">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${p.phase === 'compressing' ? 8 : p.progress}%` }}
              />
            </div>
          </div>
        ))}

        {/* Add tile */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition hover:border-blue-500 hover:text-blue-500"
          title="Add media"
        >
          <Plus className="h-6 w-6" />
          <span className="text-[11px] font-medium">Add</span>
        </button>
      </div>

      <HiddenFileInput inputRef={fileInputRef} onFiles={handleFiles} />
      {libraryOpen && (
        <MediaLibraryModal
          existing={images}
          onClose={() => setLibraryOpen(false)}
          onConfirm={(urls) => addExisting(urls, { mode, productId, images, setImages })}
        />
      )}
    </>
  );
}

/** Attach existing media-library URLs to the product. */
async function addExisting(
  urls: { url: string; altText: string | null }[],
  ctx: {
    mode: 'create' | 'edit';
    productId?: string;
    images: MediaImage[];
    setImages: React.Dispatch<React.SetStateAction<MediaImage[]>>;
  },
) {
  const existingUrls = new Set(ctx.images.map((i) => i.url));
  const fresh = urls.filter((u) => !existingUrls.has(u.url));
  if (fresh.length === 0) {
    toast.info('Those images are already attached');
    return;
  }

  // Attached locally; written to the product on save, like every other edit.
  ctx.setImages((prev) => [
    ...prev,
    ...fresh.map((u, i) => ({
      url: u.url,
      altText: u.altText || '',
      isPrimary: prev.length === 0 && i === 0,
    })),
  ]);
  toast.success(
    ctx.mode === 'edit'
      ? `✅ ${fresh.length} image(s) added — Save Changes to apply`
      : `✅ ${fresh.length} image(s) added`,
  );
}

/** Hidden multi-file input shared by the upload buttons/tiles. */
const HiddenFileInput = ({
  inputRef,
  onFiles,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
  onFiles: (files: FileList) => void;
}) => (
  <input
    ref={inputRef}
    type="file"
    multiple
    accept="image/*"
    className="hidden"
    onChange={(e) => {
      if (e.target.files?.length) onFiles(e.target.files);
      e.target.value = ''; // allow re-selecting the same file
    }}
  />
);
