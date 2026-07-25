'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useTopLoading } from '@/components/ui/top-loading-bar';
import { AlertCircle, Package, CheckCircle, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import RequestSampleModal from '@/components/samples/request-sample-modal';

interface Sample {
  id: string;
  product: {
    id: string;
    name: string;
    slug: string;
    image: string;
    basePrice: number;
  };
  status: 'requested' | 'approved' | 'shipped' | 'rejected';
  createdAt: string;
  approvedAt: string | null;
  shippedAt: string | null;
  notes: string | null;
  adminNotes: string | null;
}

type FilterStatus = 'all' | 'requested' | 'approved' | 'shipped' | 'rejected';

export default function DashboardSamplesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showModal, setShowModal] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch samples
  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchSamples = async () => {
      try {
        const res = await fetch('/api/dashboard/samples');
        if (!res.ok) {
          setError('Failed to fetch samples');
          return;
        }
        const data = await res.json();
        setSamples(data.data || []);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch samples');
        setLoading(false);
      }
    };

    fetchSamples();
  }, [status]);

  const filteredSamples = filterStatus === 'all'
    ? samples
    : samples.filter((s) => s.status === filterStatus);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested':
        return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: 'Requested', icon: '⏳' };
      case 'approved':
        return { bg: 'bg-emerald-50', border: 'border-em-200', text: 'text-em-700', label: 'Approved', icon: '✓' };
      case 'shipped':
        return { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', label: 'Shipped', icon: '📦' };
      case 'rejected':
        return { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700', label: 'Rejected', icon: '✗' };
      default:
        return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', label: 'Unknown', icon: '?' };
    }
  };

  // Global top loading bar is the only loading indicator.
  useTopLoading(status === 'loading' || !session);
  if (status === 'loading' || !session) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-normal text-ink">Sample Orders</h1>
          <p className="text-sm text-ink-2 mt-1">Request and track product samples</p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-navy-800 hover:bg-navy-900 text-white font-normal rounded-2xl px-6 py-3"
        >
          Request Sample
        </Button>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-2 border-b border-bdr pb-4"
      >
        {(['all', 'requested', 'approved', 'shipped', 'rejected'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-full text-sm font-normal transition border-2 ${
              filterStatus === status
                ? 'bg-navy-800 text-white border-navy-800'
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && ` (${samples.filter((s) => s.status === status).length})`}
          </button>
        ))}
      </motion.div>

      {/* Empty State */}
      {filteredSamples.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 rounded-md border-2 border-gray-200 p-12 text-center"
        >
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-normal text-ink mb-2">No samples yet</h3>
          <p className="text-ink-2 mb-6">
            {filterStatus === 'all'
              ? 'You haven\'t requested any samples yet.'
              : `No samples with status "${filterStatus}".`}
          </p>
          <Button
            onClick={() => {
              setFilterStatus('all');
              setShowModal(true);
            }}
            className="bg-navy-800 hover:bg-navy-900 text-white font-normal rounded-2xl px-6 py-2"
          >
            Request Your First Sample
          </Button>
        </motion.div>
      )}

      {/* Samples Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredSamples.map((sample, idx) => {
          const badge = getStatusBadge(sample.status);
          const canConvert = sample.status === 'approved';

          return (
            <motion.div
              key={sample.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`rounded-md border-2 overflow-hidden transition hover:shadow-lg ${badge.border} ${badge.bg}`}
            >
              {/* Product Image */}
              <div className="relative w-full bg-gray-50 aspect-square overflow-hidden">
                <Image
                  src={sample.product.image}
                  alt={sample.product.name}
                  fill
                  className="object-cover hover:scale-105 transition"
                />
                {/* Status Badge Overlay */}
                <div className="absolute top-3 right-3">
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${badge.bg} border-2 ${badge.border} backdrop-blur-sm`}>
                    <span className="text-sm">{badge.icon}</span>
                    <span className={`text-xs font-normal ${badge.text}`}>{badge.label}</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-normal text-ink">{sample.product.name}</h3>
                  <p className="text-sm text-ink-2 mt-1">
                    Regular price: ₹{sample.product.basePrice}
                  </p>
                </div>

                {/* Dates */}
                <div className="text-xs text-ink-3 space-y-1">
                  <p>
                    Requested:{' '}
                    {new Date(sample.createdAt).toLocaleDateString('en-IN')}
                  </p>
                  {sample.approvedAt && (
                    <p>
                      Approved:{' '}
                      {new Date(sample.approvedAt).toLocaleDateString('en-IN')}
                    </p>
                  )}
                  {sample.shippedAt && (
                    <p>
                      Shipped:{' '}
                      {new Date(sample.shippedAt).toLocaleDateString('en-IN')}
                    </p>
                  )}
                </div>

                {/* Notes */}
                {sample.adminNotes && (
                  <div className="bg-white rounded-md p-2 border border-gray-200">
                    <p className="text-xs font-normal text-ink-2 mb-1">Admin Notes</p>
                    <p className="text-xs text-ink-3">{sample.adminNotes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 space-y-2">
                  {canConvert && (
                    <Link
                      href={`/builder?product=${sample.product.id}`}
                      className="block text-center px-4 py-2 bg-em hover:bg-em-700 text-white text-sm font-normal rounded-2xl transition"
                    >
                      Convert to Bulk Order
                    </Link>
                  )}
                  {sample.status === 'shipped' && (
                    <button
                      className="w-full px-4 py-2 bg-sky-100 hover:bg-sky-200 text-sky-700 text-sm font-normal rounded-2xl transition border-2 border-sky-200"
                    >
                      Track Shipment
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Request Modal */}
      <RequestSampleModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          setShowModal(false);
          // Refresh samples
          window.location.reload();
        }}
      />
    </div>
  );
}
