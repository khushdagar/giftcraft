'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Decimal } from '@prisma/client/runtime/library';

interface VendorOverviewTabProps {
  vendor: {
    id: string;
    name: string;
    slug: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    state: string | null;
    address: string | null;
    gst: string | null;
    paymentTerms: string | null;
    notes: string | null;
    score: Decimal | null;
    priceConfirmedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

export function VendorOverviewTab({ vendor }: VendorOverviewTabProps) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(vendor.score ? Number(vendor.score) : '');
  const [formData, setFormData] = useState({
    contactName: vendor.contactName || '',
    email: vendor.email || '',
    phone: vendor.phone || '',
    city: vendor.city || '',
    state: vendor.state || '',
    address: vendor.address || '',
    gst: vendor.gst || '',
    paymentTerms: vendor.paymentTerms || '',
    notes: vendor.notes || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleScoreSave = async () => {
    const numScore = Number(score);
    if (!score || numScore < 0 || numScore > 100) {
      toast.error('Score must be between 0 and 100');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/vendors/${vendor.id}/score`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: Number(score) }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to update score');
        return;
      }

      toast.success('Score updated successfully');
    } catch (error) {
      toast.error('Error updating score');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPrices = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/vendors/${vendor.id}/confirm-prices`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to confirm prices');
        return;
      }

      toast.success('Prices confirmed for 90 days');
      window.location.reload();
    } catch (error) {
      toast.error('Error confirming prices');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/vendors/${vendor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to update vendor');
        return;
      }

      toast.success('Vendor updated successfully');
      setEditing(false);
      window.location.reload();
    } catch (error) {
      toast.error('Error updating vendor');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const daysUntilPriceExpiry = vendor.priceConfirmedAt
    ? Math.floor((90 * 24 * 60 * 60 * 1000 - (Date.now() - vendor.priceConfirmedAt.getTime())) / (24 * 60 * 60 * 1000))
    : null;

  const showPriceWarning = daysUntilPriceExpiry !== null && daysUntilPriceExpiry <= 0;

  return (
    <div className="space-y-8">
      {/* Quick Info Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-bdr rounded-lg p-4">
          <p className="text-xs font-normal text-ink-2 uppercase mb-2">Performance Score</p>
          <div className="flex items-center gap-3">
            {vendor.score ? (
              <div className="text-3xl font-normal text-ink">{Number(vendor.score).toFixed(1)}</div>
            ) : (
              <div className="text-2xl font-normal text-ink-2">—</div>
            )}
            <Button
              onClick={handleScoreSave}
              size="sm"
              className="ml-auto"
              disabled={loading}
            >
              Update
            </Button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max="100"
              value={score}
              onChange={(e) => setScore(e.target.value ? Number(e.target.value) : '')}
              placeholder="0-100"
              className="h-8 text-sm"
            />
          </div>
        </div>

        <div className="border border-bdr rounded-lg p-4">
          <p className="text-xs font-normal text-ink-2 uppercase mb-2">Price Confirmation</p>
          <p className={`font-normal ${showPriceWarning ? 'text-err' : 'text-em-700'}`}>
            {showPriceWarning ? 'Expired' : daysUntilPriceExpiry !== null ? `${daysUntilPriceExpiry} days` : 'Not confirmed'}
          </p>
          <Button
            onClick={handleConfirmPrices}
            size="sm"
            className="mt-2 w-full"
            disabled={loading}
          >
            Confirm Prices
          </Button>
        </div>

        <div className="border border-bdr rounded-lg p-4">
          <p className="text-xs font-normal text-ink-2 uppercase mb-2">Created</p>
          <p className="text-sm text-ink">{vendor.createdAt.toLocaleDateString('en-IN')}</p>
        </div>
      </div>

      {/* Details Section */}
      <div className="border border-bdr rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-normal text-ink">Vendor Details</h3>
          {!editing && (
            <Button
              onClick={() => setEditing(true)}
              variant="outline"
              size="sm"
              className="rounded-2xl"
            >
              Edit
            </Button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-normal text-ink mb-2">Contact Name</label>
                <Input
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-normal text-ink mb-2">Email</label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-normal text-ink mb-2">Phone</label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-normal text-ink mb-2">GST</label>
                <Input
                  name="gst"
                  value={formData.gst}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-normal text-ink mb-2">City</label>
                <Input
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-normal text-ink mb-2">State</label>
                <Input
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  maxLength={2}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-normal text-ink mb-2">Address</label>
              <Textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-normal text-ink mb-2">Payment Terms</label>
              <Input
                name="paymentTerms"
                value={formData.paymentTerms}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-normal text-ink mb-2">Notes</label>
              <Textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={loading}
                className="bg-em px-6 font-normal rounded-2xl"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                onClick={() => setEditing(false)}
                variant="outline"
                className="rounded-2xl"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-normal text-ink-2 uppercase mb-1">Contact Name</p>
              <p className="text-sm text-ink">{vendor.contactName}</p>
            </div>
            <div>
              <p className="text-xs font-normal text-ink-2 uppercase mb-1">Email</p>
              <p className="text-sm text-ink">{vendor.email}</p>
            </div>
            <div>
              <p className="text-xs font-normal text-ink-2 uppercase mb-1">Phone</p>
              <p className="text-sm text-ink">{vendor.phone}</p>
            </div>
            <div>
              <p className="text-xs font-normal text-ink-2 uppercase mb-1">GST</p>
              <p className="text-sm text-ink">{vendor.gst || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-normal text-ink-2 uppercase mb-1">City, State</p>
              <p className="text-sm text-ink">{vendor.city}, {vendor.state}</p>
            </div>
            <div>
              <p className="text-xs font-normal text-ink-2 uppercase mb-1">Address</p>
              <p className="text-sm text-ink">{vendor.address || '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-normal text-ink-2 uppercase mb-1">Payment Terms</p>
              <p className="text-sm text-ink">{vendor.paymentTerms || '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-normal text-ink-2 uppercase mb-1">Notes</p>
              <p className="text-sm text-ink whitespace-pre-wrap">{vendor.notes || '—'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
