'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UploadCloud, Copy, Check, ExternalLink, Link as LinkIcon } from 'lucide-react';
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
  const [fileUrl, setFileUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const appOrigin =
    typeof window !== 'undefined' ? window.location.origin : '';

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
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send mockup');
      }
      setFile(null);
      setFileUrl('');
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

  return (
    <div className="rounded-md border-2 border-bdr bg-white p-5">
      <p className="text-xs font-normal uppercase tracking-wider text-ink-3 mb-4">
        Design Approval
      </p>

      {/* Existing versions */}
      {approvals.length > 0 && (
        <div className="space-y-3 mb-5">
          {approvals.map((a) => (
            <div key={a.id} className="rounded-md border border-bdr p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-normal text-ink">
                  Mockup v{a.revision}
                </span>
                <span
                  className={`text-xs font-normal px-2 py-0.5 rounded-full ${
                    STATUS_STYLE[a.status] || 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {statusLabel(a.status)}
                </span>
              </div>

              {a.fileUrl && <MockupPreview url={a.fileUrl} revision={a.revision} />}

              {a.status === 'revision_requested' && a.revisionNotes && (
                <div className="rounded-md bg-rose-50 border border-rose-200 p-2 mb-2">
                  <p className="text-xs text-rose-700 font-normal mb-0.5">
                    Customer's change request
                  </p>
                  <p className="text-xs text-ink-2 whitespace-pre-wrap">
                    {a.revisionNotes}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyLink(a.token)}
                  className="inline-flex items-center gap-1.5 text-xs text-ink-2 hover:text-ink px-2 py-1 rounded-md border border-bdr"
                >
                  {copiedToken === a.token ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-em" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy link
                    </>
                  )}
                </button>
                <a
                  href={`/approve/${a.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-em hover:underline px-2 py-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Send a new mockup */}
      <div className="space-y-3 border-t border-bdr pt-4">
        <p className="text-sm font-normal text-ink">
          {approvals.length > 0 ? 'Send a new version' : 'Send mockup for approval'}
        </p>

        <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-bdr cursor-pointer hover:border-em text-sm text-ink-2">
          <UploadCloud className="w-4 h-4" />
          <span className="truncate">
            {file ? file.name : 'Choose mockup image…'}
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={loading}
          />
        </label>

        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-bdr" />
          <span className="text-xs text-ink-3">or</span>
          <div className="h-px flex-1 bg-bdr" />
        </div>

        <input
          type="url"
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          placeholder="Paste an image or file link (Google Drive, Dropbox…)"
          disabled={loading}
          className="w-full px-3 py-2 rounded-md border border-bdr text-sm disabled:opacity-50"
        />

        {error && <p className="text-xs text-err">{error}</p>}

        <Button
          onClick={handleSend}
          disabled={loading}
          variant="em"
          className="w-full rounded-md"
        >
          {loading ? 'Sending…' : 'Send for Approval'}
        </Button>
        <p className="text-xs text-ink-3">
          This moves the order to <span className="font-normal">Mockup Pending</span> and
          gives the customer an approval link (valid 72 hours).
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
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={`Mockup v${revision}`}
        onError={() => setImgFailed(true)}
        className="w-full h-32 object-cover rounded-md border border-bdr bg-elevated mb-2"
      />
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-md border border-bdr bg-elevated/50 p-3 mb-2 hover:border-em transition"
    >
      <div className="h-10 w-10 flex-shrink-0 rounded-md bg-sky-50 flex items-center justify-center">
        <LinkIcon className="h-5 w-5 text-sky-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-normal text-ink">View mockup file</p>
        <p className="text-xs text-ink-3 truncate">{url}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-ink-3 flex-shrink-0" />
    </a>
  );
}
