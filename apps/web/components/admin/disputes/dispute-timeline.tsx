'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';
import { DisputeStatus } from '@prisma/client';

interface DisputeTimelineProps {
  currentStatus: DisputeStatus;
  createdAt: Date;
  resolvedAt?: Date | null;
}

export function DisputeTimeline({
  currentStatus,
  createdAt,
  resolvedAt,
}: DisputeTimelineProps) {
  const statuses: DisputeStatus[] = ['open', 'under_review', 'resolved', 'closed'];

  const getStatusIcon = (status: DisputeStatus, isActive: boolean) => {
    if (status === 'resolved' || status === 'closed') {
      return <CheckCircle className="w-5 h-5" />;
    }
    if (isActive) {
      return <Clock className="w-5 h-5 animate-spin" />;
    }
    return <AlertCircle className="w-5 h-5" />;
  };

  const getStatusColor = (status: DisputeStatus, isActive: boolean) => {
    if (status === 'resolved') return 'text-emerald-600';
    if (status === 'closed') return 'text-emerald-600';
    if (isActive) return 'text-amber-600';
    if (status === 'open') return 'text-blue-600';
    return 'text-gray-400';
  };

  const getStatusLabel = (status: DisputeStatus) => {
    const labels: Record<DisputeStatus, string> = {
      open: 'Opened',
      under_review: 'Under Review',
      resolved: 'Resolved',
      closed: 'Closed',
    };
    return labels[status];
  };

  const currentIndex = statuses.indexOf(currentStatus);

  return (
    <div>
      <p className="text-sm font-normal text-ink mb-4">Timeline</p>

      <div className="space-y-4">
        {statuses.map((status, idx) => {
          const isActive = idx <= currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <motion.div
              key={status}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex gap-4"
            >
              {/* Icon */}
              <div className={`flex-shrink-0 ${getStatusColor(status, isCurrent)}`}>
                {getStatusIcon(status, isCurrent)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p
                    className={`text-sm font-normal ${
                      isActive ? 'text-ink' : 'text-ink-3'
                    }`}
                  >
                    {getStatusLabel(status)}
                  </p>
                  {isCurrent && (
                    <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                      Current
                    </span>
                  )}
                </div>

                {/* Timestamp */}
                <p className="text-xs text-ink-3 mt-1">
                  {status === 'open' && createdAt
                    ? new Date(createdAt).toLocaleString('en-IN')
                    : status === 'resolved' && resolvedAt
                    ? new Date(resolvedAt).toLocaleString('en-IN')
                    : status === 'closed' && resolvedAt
                    ? new Date(resolvedAt).toLocaleString('en-IN')
                    : 'Pending'}
                </p>
              </div>

              {/* Line connecting to next */}
              {idx < statuses.length - 1 && (
                <div
                  className={`absolute left-[21px] top-[48px] w-0.5 h-12 ${
                    isActive ? 'bg-amber-300' : 'bg-gray-200'
                  }`}
                  style={{
                    marginLeft: '-10px',
                  }}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
