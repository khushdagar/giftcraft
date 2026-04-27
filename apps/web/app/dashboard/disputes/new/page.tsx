'use client';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  deliveryDate: string;
}

export default function NewDisputePage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [formData, setFormData] = useState({
    subject: '',
    body: '',
  });
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      const { data } = await response.json();
      setOrders(data.filter((o: any) => ['delivered', 'completed'].includes(o.status)));
    } catch (error) {
      toast.error('Failed to load orders');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (photoUrls.length >= 3) {
      toast.error('Maximum 3 photos allowed');
      return;
    }

    try {
      const formDataForUpload = new FormData();
      formDataForUpload.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataForUpload,
      });

      if (!response.ok) {
        toast.error('Failed to upload photo');
        return;
      }

      const { url } = await response.json();
      setPhotoUrls((prev) => [...prev, url]);
      toast.success('Photo uploaded');
    } catch (error) {
      toast.error('Error uploading photo');
      console.error(error);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOrderId) {
      toast.error('Please select an order');
      return;
    }

    if (!formData.subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }

    if (!formData.body.trim()) {
      toast.error('Please describe the issue');
      return;
    }

    if (photoUrls.length === 0) {
      toast.error('Please upload at least one photo');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrderId,
          subject: formData.subject,
          body: formData.body,
          photoUrls,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to file dispute');
        return;
      }

      toast.success('Dispute filed successfully');
      router.push('/dashboard/disputes');
    } catch (error) {
      toast.error('Error filing dispute');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-ink-2">Loading orders...</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8 border-b border-bdr pb-8">
        <h1 className="text-3xl font-black tracking-tight text-ink">File a Dispute</h1>
        <p className="mt-2 text-sm text-ink-2">You have 48 hours from delivery to file a dispute</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Order *</label>
          <select
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            className="w-full px-4 py-3 border border-bdr rounded-lg bg-white text-ink"
            required
          >
            <option value="">Select an order...</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.orderNumber} - Delivered {new Date(order.deliveryDate).toLocaleDateString('en-IN')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Subject *</label>
          <Input
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="e.g., Damaged items, Missing products, Quality issues"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Describe the Issue *</label>
          <Textarea
            name="body"
            value={formData.body}
            onChange={handleChange}
            placeholder="Provide detailed information about the issue you experienced..."
            rows={6}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Photos (1-3 required) *</label>
          <div className="border-2 border-dashed border-bdr rounded-lg p-6 text-center">
            <input
              type="file"
              accept="image/*"
              onChange={handleAddPhoto}
              disabled={photoUrls.length >= 3}
              className="hidden"
              id="photo-input"
            />
            <label htmlFor="photo-input" className="cursor-pointer">
              <p className="text-sm font-semibold text-ink mb-1">Click to upload photos</p>
              <p className="text-xs text-ink-2">({photoUrls.length}/3 uploaded)</p>
            </label>
          </div>

          {photoUrls.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              {photoUrls.map((url, idx) => (
                <div key={idx} className="relative">
                  <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-1 right-1 bg-err text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={submitting || photoUrls.length === 0}
            className="rounded-2xl bg-em px-8 py-2 font-bold hover:bg-em-600"
          >
            {submitting ? 'Filing...' : 'File Dispute'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="rounded-2xl"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
