'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { AlertCircle, Upload } from 'lucide-react';

const DisputeFormSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(100),
  description: z.string().min(20, 'Description must be at least 20 characters').max(1000),
});

type DisputeFormData = z.infer<typeof DisputeFormSchema>;

interface DisputeFormProps {
  orderId: string;
  orderNumber: string;
  onSubmit: (data: DisputeFormData & { photos: File[] }) => Promise<void>;
  isLoading?: boolean;
}

export function DisputeForm({
  orderId,
  orderNumber,
  onSubmit,
  isLoading = false,
}: DisputeFormProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<DisputeFormData>({
    resolver: zodResolver(DisputeFormSchema),
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validate: max 3 photos, only images
    if (photos.length + files.length > 3) {
      setFormError('Maximum 3 photos allowed');
      return;
    }

    const invalidFiles = files.filter((f) => !f.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      setFormError('Only image files are allowed');
      return;
    }

    // Add files and create previews
    const newPhotos = [...photos, ...files];
    setPhotos(newPhotos);

    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls([...previewUrls, ...newPreviews]);
    setFormError(null);
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = previewUrls.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setPreviewUrls(newPreviews);
  };

  const onFormSubmit = async (data: DisputeFormData) => {
    try {
      await onSubmit({ ...data, photos });
      reset();
      setPhotos([]);
      setPreviewUrls([]);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to submit dispute');
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Order Reference */}
      <div className="rounded-md border-2 border-bdr bg-blue-50 p-4">
        <p className="text-sm text-blue-600">
          <strong>Order:</strong> {orderNumber}
        </p>
        <p className="text-xs text-blue-500 mt-1">
          You have 48 hours from delivery to file a dispute. After that, this window will close.
        </p>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">
          Subject <span className="text-err">*</span>
        </label>
        <input
          type="text"
          placeholder="e.g., Items damaged, Wrong color, Quality issue"
          {...register('subject')}
          className="w-full px-4 py-2 rounded-md border-2 border-bdr focus:border-navy-800 focus:outline-none"
        />
        {errors.subject && (
          <p className="text-xs text-err mt-1">{errors.subject.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">
          Description <span className="text-err">*</span>
        </label>
        <textarea
          placeholder="Please explain the issue in detail. What was the problem? When did you notice it?"
          rows={5}
          {...register('description')}
          className="w-full px-4 py-2 rounded-md border-2 border-bdr focus:border-navy-800 focus:outline-none resize-none"
        />
        {errors.description && (
          <p className="text-xs text-err mt-1">{errors.description.message}</p>
        )}
      </div>

      {/* Photo Upload */}
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">
          Photos <span className="text-xs text-ink-3">(optional, max 3)</span>
        </label>

        {/* Upload Button */}
        <label className="block cursor-pointer">
          <div className="border-2 border-dashed border-bdr rounded-md p-6 text-center hover:bg-blue-50 transition">
            <Upload className="w-8 h-8 text-ink-3 mx-auto mb-2" />
            <p className="text-sm font-semibold text-ink">
              Click to upload photos
            </p>
            <p className="text-xs text-ink-3 mt-1">
              or drag and drop (PNG, JPG, WebP)
            </p>
          </div>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </label>

        {/* Preview Gallery */}
        {previewUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            {previewUrls.map((url, idx) => (
              <div key={idx} className="relative aspect-square rounded-md overflow-hidden border-2 border-bdr">
                <img
                  src={url}
                  alt={`Preview ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition text-white text-sm font-semibold"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {formError && (
          <div className="mt-3 flex items-start gap-2 rounded-md bg-err/10 p-3">
            <AlertCircle className="w-4 h-4 text-err flex-shrink-0 mt-0.5" />
            <p className="text-xs text-err">{formError}</p>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting || isLoading}
        className="w-full"
      >
        {isSubmitting || isLoading ? 'Filing dispute...' : 'File Dispute'}
      </Button>
    </form>
  );
}
