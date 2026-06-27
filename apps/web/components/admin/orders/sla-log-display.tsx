'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { OrderSlaLog } from '@prisma/client';

interface SlaLogDisplayProps {
  slaLogs: OrderSlaLog[];
  currentStatus: string;
}

export function SlaLogDisplay({ slaLogs, currentStatus }: SlaLogDisplayProps) {
  const currentSla = useMemo(() => {
    return slaLogs.find((log) => log.exitedAt === null);
  }, [slaLogs]);

  const pastSlas = useMemo(() => {
    return slaLogs.filter((log) => log.exitedAt !== null).reverse();
  }, [slaLogs]);

  const getSlaStatus = (
    elapsedMinutes: number,
    slaMinutes: number,
    isBreached: boolean
  ) => {
    if (isBreached) {
      return { status: 'breached', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' };
    }
    const percent = (elapsedMinutes / slaMinutes) * 100;
    if (percent >= 80) {
      return { status: 'warning', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
    }
    return { status: 'on-track', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
  };

  const formatMinutes = (minutes: number): string => {
    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = Math.floor(minutes % 60);

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  };

  if (!currentSla && pastSlas.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Current SLA Card */}
      {currentSla && (
        <div>
          <h3 className="text-sm font-normal uppercase tracking-wider text-ink-3 mb-3">
            Current Stage SLA
          </h3>

          {(() => {
            const now = new Date();
            const elapsedMinutes =
              (now.getTime() - currentSla.enteredAt.getTime()) / (1000 * 60);
            const remainingMinutes = currentSla.slaMinutes - elapsedMinutes;
            const slaStatus = getSlaStatus(
              elapsedMinutes,
              currentSla.slaMinutes,
              currentSla.isBreached
            );

            return (
              <div className={`rounded-md border-2 p-6 ${slaStatus.bg} ${slaStatus.border}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-2xl font-normal text-ink">{currentSla.stage}</p>
                    <p className="text-xs text-ink-3 mt-1">
                      Entered {new Date(currentSla.enteredAt).toLocaleDateString('en-IN')} at{' '}
                      {new Date(currentSla.enteredAt).toLocaleTimeString('en-IN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {slaStatus.status === 'breached' ? (
                      <AlertCircle className="w-6 h-6 text-rose-600" />
                    ) : slaStatus.status === 'warning' ? (
                      <Clock className="w-6 h-6 text-amber-600" />
                    ) : (
                      <CheckCircle className="w-6 h-6 text-emerald-600" />
                    )}
                    <span className={`font-normal text-sm ${slaStatus.color}`}>
                      {slaStatus.status === 'breached'
                        ? 'SLA Breached'
                        : slaStatus.status === 'warning'
                        ? 'Warning'
                        : 'On Track'}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between mb-2">
                    <p className="text-xs font-normal text-ink-2">Time Spent</p>
                    <p className="text-xs font-normal text-ink">
                      {formatMinutes(Math.round(elapsedMinutes))} / {formatMinutes(currentSla.slaMinutes)}
                    </p>
                  </div>
                  <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-gray-300">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min((elapsedMinutes / currentSla.slaMinutes) * 100, 100)}%`,
                      }}
                      transition={{ duration: 0.5 }}
                      className={`h-full ${
                        slaStatus.status === 'breached'
                          ? 'bg-rose-500'
                          : slaStatus.status === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Time Remaining */}
                <div className="bg-white rounded-md p-3 border border-gray-200">
                  <p className="text-xs text-ink-3 mb-1">Time Remaining</p>
                  <p
                    className={`text-lg font-normal ${
                      remainingMinutes < 0 ? 'text-rose-600' : 'text-ink'
                    }`}
                  >
                    {remainingMinutes < 0
                      ? `Overdue by ${formatMinutes(Math.abs(remainingMinutes))}`
                      : `${formatMinutes(Math.round(remainingMinutes))} left`}
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Past SLAs History */}
      {pastSlas.length > 0 && (
        <div>
          <h3 className="text-sm font-normal uppercase tracking-wider text-ink-3 mb-3">
            SLA History
          </h3>

          <div className="space-y-2">
            {pastSlas.map((log, idx) => {
              const elapsedMinutes =
                (log.exitedAt!.getTime() - log.enteredAt.getTime()) / (1000 * 60);
              const slaStatus = getSlaStatus(elapsedMinutes, log.slaMinutes, log.isBreached);

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`rounded-md border-2 p-3 ${slaStatus.bg} ${slaStatus.border}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {slaStatus.status === 'breached' ? (
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-normal text-ink">{log.stage}</p>
                        <p className="text-xs text-ink-3">
                          {formatMinutes(Math.round(elapsedMinutes))} / {formatMinutes(log.slaMinutes)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-normal px-2 py-1 rounded-full ${
                        slaStatus.status === 'breached'
                          ? 'bg-rose-200 text-rose-700'
                          : 'bg-emerald-200 text-emerald-700'
                      }`}
                    >
                      {slaStatus.status === 'breached' ? 'Breached' : 'OK'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
