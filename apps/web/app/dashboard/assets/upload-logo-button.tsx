'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Logo formats accepted per SOW §3.3.9: PNG, SVG, AI, EPS, PDF, JPG. Max 10MB.
const ALLOWED = ['.jpg', '.jpeg', '.png', '.svg', '.ai', '.eps', '.pdf'];

export function UploadLogoButton({
  label = 'Upload Asset',
  full = false,
}: {
  label?: string;
  full?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    if (!ALLOWED.some((ext) => name.endsWith(ext))) {
      setError('Only JPG, PNG, SVG, AI, EPS, and PDF files are allowed');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/brand-assets', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={full ? 'mx-auto flex flex-col items-center' : ''}>
      <Button
        variant="em"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {uploading ? 'Uploading…' : label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.svg,.ai,.eps,.pdf"
        onChange={handleChange}
        className="hidden"
      />
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
