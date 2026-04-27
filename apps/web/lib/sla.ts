import { SLA_MINUTES } from './constants';

export type SLAStatus = 'on-track' | 'warning' | 'breached';

/**
 * Calculate SLA status based on elapsed time and SLA minutes
 * on-track: elapsed < 80% of slaMinutes
 * warning: elapsed 80–100% of slaMinutes
 * breached: elapsed > slaMinutes
 */
export function getSlaStatus(enteredAt: Date, slaMinutes: number): SLAStatus {
  if (slaMinutes === 0) return 'on-track'; // terminal stages have no SLA

  const now = new Date();
  const elapsedMs = now.getTime() - enteredAt.getTime();
  const elapsedMinutes = elapsedMs / (1000 * 60);
  const percentUsed = (elapsedMinutes / slaMinutes) * 100;

  if (percentUsed > 100) return 'breached';
  if (percentUsed >= 80) return 'warning';
  return 'on-track';
}

/**
 * Calculate remaining time in a stage
 * Returns: { minutes, hours, days } or { status: 'expired' } if breached
 */
export function getTimeRemaining(enteredAt: Date, slaMinutes: number) {
  if (slaMinutes === 0) return { status: 'terminal' };

  const now = new Date();
  const elapsedMs = now.getTime() - enteredAt.getTime();
  const elapsedMinutes = elapsedMs / (1000 * 60);
  const remainingMinutes = Math.max(0, slaMinutes - elapsedMinutes);

  if (remainingMinutes === 0) return { status: 'expired' };

  const hours = Math.floor(remainingMinutes / 60);
  const minutes = Math.floor(remainingMinutes % 60);
  const days = Math.floor(hours / 24);

  return {
    totalMinutes: Math.ceil(remainingMinutes),
    minutes,
    hours: hours % 24,
    days,
    display:
      days > 0
        ? `${days}d ${hours % 24}h`
        : hours > 0
          ? `${hours}h ${minutes}m`
          : `${minutes}m`,
  };
}

/**
 * Get SLA minutes for a given stage
 */
export function getSlaMinutesForStage(stage: string): number {
  return SLA_MINUTES[stage] ?? 0;
}
