'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertCircle, TrendingUp } from 'lucide-react';

interface SlaViolation {
  id: string;
  orderNumber: string;
  status: string;
  stage: string;
  companyName: string;
  breachedByMinutes: number;
  breachedByFormatted: string;
  isActive: boolean;
}

export function SlaAlertWidget() {
  const [violations, setViolations] = useState<SlaViolation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchViolations = async () => {
      try {
        const res = await fetch('/api/admin/orders/sla-violations?limit=3');
        if (res.ok) {
          const data = await res.json();
          setViolations(data.data || []);
          setTotal(data.pagination.total || 0);
        }
      } catch (err) {
        console.error('Failed to fetch SLA violations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchViolations();

    // Refresh every 5 minutes
    const interval = setInterval(fetchViolations, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-md border-2 border-bdr p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (total === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-md border-2 border-em-200 p-6"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center">
            <span className="text-lg">✓</span>
          </div>
          <h3 className="text-lg font-bold text-em-700">All SLAs On Track</h3>
        </div>
        <p className="text-sm text-em-600">No orders breaching SLA targets</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-rose-50 to-orange-50 rounded-md border-2 border-rose-200 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-200 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-rose-700">SLA Violations</h3>
            <p className="text-xs text-rose-600">{total} order{total !== 1 ? 's' : ''} breached</p>
          </div>
        </div>
      </div>

      {/* Violations List */}
      <div className="space-y-2 mb-4">
        {violations.map((violation) => (
          <Link
            key={violation.id}
            href={`/admin/orders/${violation.orderId}`}
            className="block p-3 rounded-md bg-white border-l-4 border-rose-500 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-ink">{violation.orderNumber}</p>
                <p className="text-xs text-ink-3">
                  {violation.companyName} • {violation.stage}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-rose-600">
                  Overdue {violation.breachedByFormatted}
                </p>
                <p className="text-[10px] text-ink-3">
                  {violation.isActive ? 'Active' : 'Completed'}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <Link
        href="/admin/orders/sla-violations"
        className="inline-block text-xs font-semibold text-rose-700 hover:text-rose-900 underline"
      >
        View all {total} violation{total !== 1 ? 's' : ''} →
      </Link>
    </motion.div>
  );
}
