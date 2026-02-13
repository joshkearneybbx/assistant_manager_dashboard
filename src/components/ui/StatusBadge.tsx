import { HealthStatus, PerformanceStatus, StuckStatus } from '../../types';

type BadgeStatus = HealthStatus | PerformanceStatus | StuckStatus | string;

interface StatusBadgeProps {
  status: BadgeStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = String(status).toLowerCase();
  const classes =
    normalized === 'red' || normalized === 'stuck'
      ? 'border-status-red bg-status-red-light text-status-red'
      : normalized === 'amber' || normalized === 'aging' || normalized === 'delayed'
        ? 'border-status-orange bg-status-orange-light text-status-orange-text'
        : normalized === 'green'
          ? 'border-status-green bg-status-green-light text-status-green'
          : 'border-sand-300 bg-sand-200 text-grey-400';

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${classes}`}>
      {status}
    </span>
  );
}
