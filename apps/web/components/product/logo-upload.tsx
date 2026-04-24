'use client';

import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function LogoUpload() {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);

    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPG, PNG, and SVG files are allowed');
      return;
    }

    if (file.size > MAX_SIZE) {
      setError('File size must be less than 5MB');
      return;
    }

    setFileName(file.name);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
  };

  const clearPreview = () => {
    setPreview(null);
    setFileName(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div>
      <p className="overline mb-3 text-ink-3">YOUR LOGO</p>

      {!preview ? (
        <label className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-bdr bg-elevated p-8 cursor-pointer hover:border-em transition">
          <Upload className="h-8 w-8 text-ink-3 mb-2" />
          <p className="text-sm font-semibold text-ink-2">Upload your logo</p>
          <p className="text-xs text-ink-3 mt-1">JPG, PNG, or SVG • Max 5MB</p>
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.svg"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      ) : (
        <div className="relative rounded-md border-2 border-bdr bg-white overflow-hidden">
          <div className="relative aspect-square bg-elevated flex items-center justify-center p-4">
            <img
              src={preview}
              alt="Logo preview"
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">{fileName}</p>
              <p className="text-xs text-ink-2">Ready to be added to your pack</p>
            </div>
            <button
              onClick={clearPreview}
              className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"
            >
              <X className="h-4 w-4 text-ink-2" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
