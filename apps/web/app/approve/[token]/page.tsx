'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { formatRupees } from '@/lib/utils';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface ApprovalData {
  id: string;
  orderId: string;
  revision: number;
  fileUrl: string;
  status: 'pending' | 'approved' | 'revision_requested';
  revisionNotes: string | null;
  approvedAt: string | null;
  expiresAt: string;
  createdAt: string;
  order: {
    id: string;
    orderNumber: string;
    grandTotal: number;
    deliveryDate: string | null;
    items: Array<{
      product: { name: string; slug: string };
      quantity: number;
      unitPrice: number;
    }>;
    company: { name: string } | null;
    placedBy: { name: string } | null;
  };
}

interface PageProps {
  params: { token: string };
}

export default function ApprovePage({ params }: PageProps) {
  const { token } = params;
  const [approval, setApproval] = useState<ApprovalData | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [showRevisionForm, setShowRevisionForm] = useState(false);

  // Fetch approval data
  useEffect(() => {
    const fetchApproval = async () => {
      try {
        const res = await fetch(`/api/approve/${token}`);
        if (res.status === 404) {
          setError('Approval not found');
          setLoading(false);
          return;
        }
        if (res.status === 410) {
          setError('This approval link has expired');
          setLoading(false);
          return;
        }
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Failed to load approval');
          setLoading(false);
          return;
        }
        const data = await res.json();
        setApproval(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load approval');
        setLoading(false);
      }
    };
    fetchApproval();
  }, [token]);

  const handleApprove = async () => {
    if (!approval || !confirmChecked) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/approve/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to approve');
        setSubmitting(false);
        return;
      }
      setSuccessMessage('Artwork approved successfully! Order is now ready for production.');
      setApproval((prev) =>
        prev ? { ...prev, status: 'approved', approvedAt: new Date().toISOString() } : null
      );
      setSubmitting(false);
    } catch (err) {
      setError('Failed to approve');
      setSubmitting(false);
    }
  };

  const handleRevisionSubmit = async () => {
    if (!approval || !revisionNotes.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/approve/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revision',
          notes: revisionNotes.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to submit revision request');
        setSubmitting(false);
        return;
      }
      setSuccessMessage(
        'Revision request submitted! The design team will review your notes and get back to you.'
      );
      setApproval((prev) =>
        prev ? { ...prev, status: 'revision_requested' } : null
      );
      setShowRevisionForm(false);
      setRevisionNotes('');
      setSubmitting(false);
    } catch (err) {
      setError('Failed to submit revision request');
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-emerald-50 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-em"></div>
          <p className="mt-4 text-ink-2">Loading approval...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-emerald-50 to-rose-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-md border-2 border-err p-8 max-w-md w-full text-center"
        >
          <AlertCircle className="w-16 h-16 text-err mx-auto mb-4" />
          <h1 className="text-2xl font-normal text-ink mb-2">Oops!</h1>
          <p className="text-ink-2 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-2 rounded-2xl bg-em text-white font-normal hover:bg-em-700 transition"
          >
            Back to Home
          </a>
        </motion.div>
      </div>
    );
  }

  if (!approval) {
    return null;
  }

  const isExpired = new Date() > new Date(approval.expiresAt);
  const isApproved = approval.status === 'approved';

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-emerald-50 to-rose-50">
      {/* Header */}
      <div className="bg-white border-b-2 border-bdr">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-normal text-ink">Design Approval</h1>
              <p className="text-sm text-ink-2 mt-1">
                Order {approval.order.orderNumber} • Revision {approval.revision}
              </p>
            </div>
            {isApproved && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border-2 border-em-200">
                <CheckCircle className="w-5 h-5 text-em" />
                <span className="font-normal text-em text-sm">Approved</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-md bg-emerald-50 border-2 border-em-200 flex gap-3"
          >
            <CheckCircle className="w-5 h-5 text-em flex-shrink-0 mt-0.5" />
            <p className="text-em text-sm font-normal">{successMessage}</p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Mockup Image */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-md border-2 border-bdr overflow-hidden"
            >
              <div className="relative w-full bg-gray-50 aspect-square">
                <Image
                  src={approval.fileUrl}
                  alt="Design mockup"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <div className="p-4 bg-gray-50 border-t border-bdr">
                <p className="text-xs text-ink-3">
                  Created {new Date(approval.createdAt).toLocaleDateString('en-IN')} •
                  {' '}
                  {Math.ceil((new Date(approval.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60))} hours remaining
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right: Order Info & Actions */}
          <div className="space-y-4">
            {/* Order Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-sky-50 rounded-md border-2 border-sky-200 p-4"
            >
              <h3 className="text-sm font-normal text-sky-700 mb-3">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-2">Order #</span>
                  <span className="font-normal text-ink">{approval.order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-2">Company</span>
                  <span className="font-normal text-ink text-right">
                    {approval.order.company?.name || approval.order.placedBy?.name || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-2">Quantity</span>
                  <span className="font-normal text-ink">
                    {approval.order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                  </span>
                </div>
                <div className="border-t border-sky-200 pt-2 mt-2 flex justify-between">
                  <span className="text-ink-2">Total Amount</span>
                  <span className="text-xl font-normal text-ink">
                    {formatRupees(approval.order.grandTotal)}
                  </span>
                </div>
                {approval.order.deliveryDate && (
                  <div className="border-t border-sky-200 pt-2 mt-2">
                    <span className="text-xs text-ink-3">
                      Delivery by {new Date(approval.order.deliveryDate).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Action Panel */}
            {!isApproved && !successMessage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-3"
              >
                {/* Approve Button */}
                <div className="bg-emerald-50 rounded-md border-2 border-em-200 p-4 space-y-3">
                  <h3 className="text-sm font-normal text-em-700">Approve Artwork</h3>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={confirmChecked}
                      onChange={(e) => setConfirmChecked(e.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-xs text-ink-2 group-hover:text-ink">
                      I confirm the artwork is correct and ready for production
                    </span>
                  </label>
                  <Button
                    onClick={handleApprove}
                    disabled={!confirmChecked || submitting}
                    className="w-full bg-em hover:bg-em-700 text-white font-normal rounded-2xl py-3 disabled:opacity-50"
                  >
                    {submitting ? 'Approving...' : 'Approve & Proceed'}
                  </Button>
                </div>

                {/* Revision Button */}
                <div className="bg-rose-50 rounded-md border-2 border-rose-200 p-4 space-y-3">
                  <h3 className="text-sm font-normal text-rose-700">Request Changes</h3>
                  <p className="text-xs text-ink-3">
                    Need adjustments? Let our team know what changes you'd like.
                  </p>
                  {!showRevisionForm ? (
                    <Button
                      onClick={() => setShowRevisionForm(true)}
                      variant="outline"
                      className="w-full border-rose-300 text-rose-700 hover:bg-rose-100 rounded-2xl font-normal"
                    >
                      Request Revision
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={revisionNotes}
                        onChange={(e) => setRevisionNotes(e.target.value)}
                        placeholder="Describe the changes you'd like (e.g., change color to blue, make logo 20% larger)"
                        className="w-full px-3 py-2 rounded-md border border-bdr text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                        rows={4}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleRevisionSubmit}
                          disabled={!revisionNotes.trim() || submitting}
                          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-normal rounded-2xl py-2 disabled:opacity-50"
                        >
                          {submitting ? 'Sending...' : 'Send Notes'}
                        </Button>
                        <Button
                          onClick={() => {
                            setShowRevisionForm(false);
                            setRevisionNotes('');
                          }}
                          variant="outline"
                          className="flex-1 border-bdr rounded-2xl font-normal"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Already Approved Info */}
            {isApproved && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-emerald-50 rounded-md border-2 border-em-200 p-4"
              >
                <div className="flex gap-3">
                  <CheckCircle className="w-5 h-5 text-em flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-normal text-em-700">Already Approved</p>
                    <p className="text-xs text-ink-2 mt-1">
                      This artwork was approved on{' '}
                      {new Date(approval.approvedAt!).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Expiry Warning */}
            {!isApproved && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-amber-50 rounded-md border-2 border-amber-200 p-3 flex gap-3"
              >
                <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Approval link expires in{' '}
                  {Math.ceil((new Date(approval.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60))} hours
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
