import { useQuery } from '@tanstack/react-query';
import { toDisplayAssistantName } from '../lib/displayName';
import { toNumber, toStringValue } from '../lib/normalize';
import { sql } from '../lib/neon';
import { ClientHealthRow } from '../types';
import { FilterState, shouldLogFilters } from './useFilters';

interface UseClientHealthOptions {
  enabled?: boolean;
}

function toIsoStringOrNull(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return toStringValue(value);
}

function daysSince(value: string | null): number {
  if (!value) return 9999;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 9999;
  const diffMs = Date.now() - parsed.getTime();
  return Math.max(0, Math.floor(diffMs / 86400000));
}

function toNullableDays(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sortableDays(value: number | null | undefined): number {
  return value == null ? 9999 : value;
}

function normalizeHealthStatus(value: unknown): ClientHealthRow['health_status'] {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  if (normalized === 'red') return 'Red';
  if (normalized === 'amber') return 'Amber';
  if (normalized === 'purple') return 'Purple';
  return 'Green';
}

export function useClientHealth(filters: FilterState, options?: UseClientHealthOptions) {
  return useQuery<ClientHealthRow[]>({
    queryKey: ['v_client_health', filters],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const assistantId = filters.assistant[0] ?? null;
      const familyId = filters.client[0] ?? null;
      const planType = filters.contract[0] ?? null;
      const status = filters.status[0] ?? null;

      if (shouldLogFilters) {
        // eslint-disable-next-line no-console
        console.info('[filters:applied][v_client_health]', { assistantId, familyId, planType, status });
      }

      let baseRows: Record<string, unknown>[];
      try {
        baseRows = (await sql`
          SELECT *
          FROM v_client_health
          WHERE (${assistantId}::text IS NULL OR assistant_id::text = ${assistantId}::text)
            AND (${familyId}::text IS NULL OR family_id::text = ${familyId}::text)
            AND (${planType}::text IS NULL OR COALESCE(subscription_type, contract)::text = ${planType}::text)
        `) as Record<string, unknown>[];
      } catch {
        baseRows = (await sql`
          SELECT *
          FROM v_client_health
          WHERE (${assistantId}::text IS NULL OR assistant_id::text = ${assistantId}::text)
            AND (${familyId}::text IS NULL OR family_id::text = ${familyId}::text)
            AND (${planType}::text IS NULL OR contract::text = ${planType}::text)
        `) as Record<string, unknown>[];
      }

      const taskMetricRows = (await sql`
        SELECT
          t.family_id::text AS family_id,
          COUNT(*) FILTER (
            WHERE t.closed_at IS NULL
              AND t.task_state IN ('Active', 'Delayed', 'New', 'Not Started')
              AND (
                t.task_status IS NULL
                OR t.task_status NOT IN ('4. Done', '7. Cancelled', '8. Redundant')
              )
          ) AS active_tasks,
          MAX(COALESCE(t.closed_at, t.created_at)) AS last_task_at
        FROM tasks t
        WHERE (
          t.source_detailed IS NULL
          OR t.source_detailed NOT IN ('Engagement', 'Marketing', 'Initiative')
        )
        GROUP BY t.family_id::text
      `) as Record<string, unknown>[];

      const metricsByFamily = new Map<
        string,
        {
          active_tasks: number;
          last_task_at: string | null;
        }
      >();

      for (const row of taskMetricRows) {
        const key = toStringValue(row.family_id);
        metricsByFamily.set(key, {
          active_tasks: toNumber(row.active_tasks),
          last_task_at: toIsoStringOrNull(row.last_task_at)
        });
      }

      const mergedRows = baseRows
        .map((row) => {
          const currentFamilyId = toStringValue(row.family_id);
          const metrics = metricsByFamily.get(currentFamilyId);

          const viewLastTaskAt =
            toIsoStringOrNull(row.last_task_at) ??
            toIsoStringOrNull(row.last_activity_at) ??
            metrics?.last_task_at ??
            null;

          const days_since_last_task =
            row.days_since_last_task == null
              ? daysSince(viewLastTaskAt)
              : toNumber(row.days_since_last_task);

          const viewActiveTasks = row.active_tasks == null ? metrics?.active_tasks ?? 0 : toNumber(row.active_tasks);

          return {
            family_id: currentFamilyId,
            family_name: toStringValue(row.family_name),
            assistant_id: toStringValue(row.assistant_id),
            assistant_name: toDisplayAssistantName(toStringValue(row.assistant_name)),
            contract: row.contract == null ? null : toStringValue(row.contract),
            subscription_type:
              row.subscription_type == null
                ? (row.contract == null ? null : toStringValue(row.contract))
                : toStringValue(row.subscription_type),
            life_transitions: row.life_transitions == null ? null : toStringValue(row.life_transitions),
            life_transition_icons:
              row.life_transition_icons == null ? null : toStringValue(row.life_transition_icons),
            active_tasks: viewActiveTasks,
            days_since_last_task,
            days_since_last_completion: toNullableDays(row.days_since_last_completion),
            health_status: normalizeHealthStatus(row.health_status),
            flex_tasks_used: row.flex_tasks_used == null ? 0 : toNumber(row.flex_tasks_used)
          } as ClientHealthRow;
        })
        .filter((row) => (status ? row.health_status === status : true))
        .sort((a, b) => sortableDays(b.days_since_last_task) - sortableDays(a.days_since_last_task));

      return mergedRows;
    }
  });
}
