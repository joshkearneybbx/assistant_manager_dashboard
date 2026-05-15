import type { ClientHealthRow } from '../../types';

type FlexUsageRow = Pick<
  ClientHealthRow,
  'subscription_type' | 'flex_tasks_used' | 'flex_task_limit' | 'flex_travel_tasks_used' | 'flex_travel_task_limit'
>;

export function isFlexClient(row: Pick<ClientHealthRow, 'subscription_type'>): boolean {
  return row.subscription_type === 'Flex';
}

export function flexUsageClass(used: number, limit: number): string {
  if (used >= limit) return 'border-status-purple bg-status-purple-light text-status-purple';
  if (used >= limit - 2) return 'border-status-orange bg-status-orange-light text-status-orange-text';
  return 'border-status-green bg-status-green-light text-status-green';
}

export function flexTravelUsageClass(used: number, limit: number): string {
  if (used >= limit) return 'border-status-purple bg-status-purple-light text-status-purple';
  if (used >= limit - 1) return 'border-status-orange bg-status-orange-light text-status-orange-text';
  return 'border-status-green bg-status-green-light text-status-green';
}

export function FlexTaskPill({ row }: { row: FlexUsageRow }) {
  const used = row.flex_tasks_used ?? 0;
  const limit = row.flex_task_limit ?? 0;

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${flexUsageClass(used, limit)}`}>
      {used}/{limit}
    </span>
  );
}

export function FlexTravelTaskPill({ row }: { row: FlexUsageRow }) {
  const used = row.flex_travel_tasks_used ?? 0;
  const limit = row.flex_travel_task_limit ?? 0;

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${flexTravelUsageClass(used, limit)}`}>
      {used}/{limit} ✈️
    </span>
  );
}
