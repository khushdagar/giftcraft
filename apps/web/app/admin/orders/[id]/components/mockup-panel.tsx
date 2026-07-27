'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  UploadCloud,
  Copy,
  Check,
  ExternalLink,
  Link as LinkIcon,
  X,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { isImageUrl } from '@/lib/mockup-url';

export interface MockupApproval {
  id: string;
  revision: number;
  fileUrl: string | null;
  token: string;
  status: string; // pending | approved | revision_requested
  revisionNotes: string | null;
  approvedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-em-50 text-em-700',
  revision_requested: 'bg-rose-50 text-rose-700',
};

function statusLabel(s: string) {
  if (s === 'revision_requested') return 'Changes Requested';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function MockupPanel({
  orderId,
  approvals,
}: {
  orderId: string;
  approvals: MockupApproval[];
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [showLink, setShowLink] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const chooseFile = (f: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : '');
    if (f) setError('');
  };

  const handleSend = async () => {
    setError('');
    if (!file && !fileUrl.trim()) {
      setError('Upload a mockup image or paste a file link.');
      return;
    }
    setLoading(true);
    try {
      const body = new FormData();
      if (file) body.append('image', file);
      if (fileUrl.trim()) body.append('fileUrl', fileUrl.trim());

      const res = await fetch(`/api/admin/orders/${orderId}/mockup`, {
        method: 'POST',
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to send mockup');
      chooseFile(null);
      setFileUrl('');
      setShowLink(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send mockup');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async (token: string) => {
    const url = `${appOrigin}/approve/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken((t) => (t === token ? null : t)), 2000);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  // Newest first — the top card is the "current" mockup.
  const sorted = [...approvals].sort((a, b) => b.revision - a.revision);

  return (
    <div className="space-y-5 rounded-md border border-bdr bg-white p-5">
      <div>
        <h3 className="text-sm font-semibold text-ink">Design Approval</h3>
        <p className="mt-0.5 text-xs text-ink-3">
          Send the customer a mockup to approve before production starts.
        </p>
      </div>

      {/* Version history */}
      {sorted.length > 0 && (
        <div className="space-y-3">
          {sorted.map((a, i) => {
            const link = `${appOrigin}/approve/${a.token}`;
            const isCurrent = i === 0;
            return (
              <div
                key={a.id}
                className={`overflow-hidden rounded-md border ${
                  isCurrent ? 'border-bdr' : 'border-bdr/70 opacity-90'
                }`}
              >
                <div className="flex items-center justify-between border-b border-bdr bg-elevated/40 px-3 py-2">
                  <span className="text-sm font-medium text-ink">
                    Mockup v{a.revision}
                    {isCurrent && <span className="ml-2 text-xs text-ink-3">· current</span>}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_STYLE[a.status] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {statusLabel(a.status)}
                  </span>
                </div>

                <div className="p-3">
                  {a.fileUrl && <MockupPreview url={a.fileUrl} revision={a.revision} />}

                  {/* State hint */}
                  {a.status === 'pending' && (
                    <div className="mb-2 flex items-center gap-1.5 text-xs text-ink-3">
                      <Clock className="h-3.5 w-3.5" /> Waiting for the customer to review
                    </div>
                  )}
                  {a.status === 'approved' && (
                    <div className="mb-2 flex items-center gap-1.5 text-xs text-em-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                      {a.approvedAt
                        ? ` on ${new Date(a.approvedAt).toLocaleDateString('en-IN')}`
                        : ''}
                    </div>
                  )}
                  {a.status === 'revision_requested' && a.revisionNotes && (
                    <div className="mb-2 rounded-md border border-rose-200 bg-rose-50 p-2">
                      <p className="mb-0.5 text-xs font-medium text-rose-700">
                        Customer's change request
                      </p>
                      <p className="whitespace-pre-wrap text-xs text-ink-2">{a.revisionNotes}</p>
                    </div>
                  )}

                  {/* Approval link — the thing you send the customer */}
                  <div className="rounded-md border border-bdr bg-elevated/30 p-2">
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-3">
                      Customer approval link
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={link}
                        onFocus={(e) => e.currentTarget.select()}
                        className="min-w-0 flex-1 truncate rounded border border-bdr bg-white px-2 py-1 text-xs text-ink-2"
                      />
                      <button
                        onClick={() => copyLink(a.token)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-bdr px-2 py-1 text-xs text-ink-2 hover:bg-white"
                      >
                        {copiedToken === a.token ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-em" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" /> Copy
                          </>
                        )}
                      </button>
                      <a
                        href={`/approve/${a.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-bdr px-2 py-1 text-xs text-em hover:bg-white"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Open
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Send a new mockup */}
      <div className="space-y-3 border-t border-bdr pt-4">
        <p className="text-sm font-medium text-ink">
          {sorted.length > 0 ? 'Send a new version' : 'Send first mockup'}
        </p>

        {/* Upload zone / preview */}
        {file ? (
          <div className="flex items-center gap-3 rounded-md border border-bdr p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={file.name} className="h-14 w-14 rounded object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink">{file.name}</p>
              <p className="text-xs text-ink-3">Ready to send</p>
            </div>
            <button
              onClick={() => chooseFile(null)}
              className="rounded-md p-1.5 text-ink-3 hover:bg-elevated hover:text-ink"
              title="Remove"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) chooseFile(f);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed p-6 text-center transition ${
              dragOver ? 'border-em bg-em-50/40' : 'border-bdr hover:border-em'
            }`}
          >
            <UploadCloud className="h-6 w-6 text-ink-3" />
            <span className="text-sm text-ink-2">
              Drag &amp; drop or <span className="font-medium text-em">click to upload</span>
            </span>
            <span className="text-xs text-ink-3">PNG, JPG up to 5MB</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
              disabled={loading}
            />
          </label>
        )}

        {/* Paste-a-link — secondary, tucked away to reduce clutter */}
        {showLink ? (
          <div className="space-y-1">
            <input
              type="url"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="Paste an image or file link (Google Drive, Dropbox…)"
              disabled={loading}
              className="w-full rounded-md border border-bdr px-3 py-2 text-sm disabled:opacity-50"
            />
            <button
              onClick={() => {
                setShowLink(false);
                setFileUrl('');
              }}
              className="text-xs text-ink-3 hover:text-ink"
            >
              Cancel link
            </button>
          </div>
        ) : (
          !file && (
            <button
              onClick={() => setShowLink(true)}
              className="inline-flex items-center gap-1.5 text-xs text-ink-2 hover:text-ink"
            >
              <LinkIcon className="h-3.5 w-3.5" /> or paste a file link instead
            </button>
          )
        )}

        {error && <p className="text-xs text-err">{error}</p>}

        <Button onClick={handleSend} disabled={loading} variant="em" className="w-full rounded-md">
          {loading ? 'Sending…' : 'Send for Approval'}
        </Button>
        <p className="text-xs text-ink-3">
          This moves the order to <span className="font-medium">Mockup Pending</span> and gives the
          customer an approval link (valid 72 hours).
        </p>
      </div>
    </div>
  );
}

/**
 * Renders a mockup as an inline image when the URL is a direct image, or as a
 * clickable link card when it's a share link (Google Drive, Dropbox, etc.).
 * Also falls back to the link card if an image-looking URL fails to load.
 */
function MockupPreview({ url, revision }: { url: string; revision: number }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (isImageUrl(url) && !imgFailed) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" title="Open full image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={`Mockup v${revision}`}
          onError={() => setImgFailed(true)}
          className="mb-2 h-24 w-full rounded-md border border-bdr bg-elevated object-cover transition hover:opacity-90"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mb-2 flex items-center gap-3 rounded-md border border-bdr bg-elevated/50 p-3 transition hover:border-em"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-sky-50">
        <LinkIcon className="h-5 w-5 text-sky-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">View mockup file</p>
        <p className="truncate text-xs text-ink-3">{url}</p>
      </div>
      <ExternalLink className="h-4 w-4 flex-shrink-0 text-ink-3" />
    </a>
  );
}
