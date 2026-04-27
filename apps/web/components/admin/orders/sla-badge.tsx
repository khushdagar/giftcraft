'use client';

import { useEffect, useState } from 'react';
import { getSlaStatus, getTimeRemaining } from '@/lib/sla';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface SLABadgeProps {
  enteredAt: Date;
  slaMinutes: number;
}

export function SLABadge({ enteredAt, slaMinutes }: SLABadgeProps) {
  const [status, setStatus] = useState<'on-track' | 'warning' | 'breached'>('on-track');
  const [timeDisplay, setTimeDisplay] = useState<string>('');

  useEffect(() => {
    const updateStatus = () => {
      const currentStatus = getSlaStatus(enteredAt, slaMinutes);
      setStatus(currentStatus);

      const timeInfo = getTimeRemaining(enteredAt, slaMinutes);
      if ('display' in timeInfo) {
        setTimeDisplay(timeInfo.display || '0m');
      } else if ('status' in timeInfo && timeInfo.status === 'expired') {
        setTimeDisplay('Overdue');
      } else {
        setTimeDisplay('Terminal');
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [enteredAt, slaMinutes]);

  if (slaMinutes === 0) {
    return null; // No SLA for terminal stages
  }

  const colorMap = {
    'on-track': {
      bg: 'bg-em-50',
      text: 'text-em-700',
      border: 'border-em-200',
      icon: 'text-em-600',
    },
    warning: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: 'text-amber-600',
    },
    breached: {
      bg: 'bg-err/10',
      text: 'text-err',
      border: 'border-red-200',
      icon: 'text-err',
    },
  };

  const colors = colorMap[status];

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${colors.bg} ${colors.border}`}>
      {status === 'on-track' && <CheckCircle className={`h-3.5 w-3.5 ${colors.icon}`} />}
      {status === 'warning' && <Clock className={`h-3.5 w-3.5 ${colors.icon}`} />}
      {status === 'breached' && <AlertTriangle className={`h-3.5 w-3.5 ${colors.icon}`} />}
      <span className={`text-xs font-semibold ${colors.text}`}>{timeDisplay}</span>
    </div>
  );
}
