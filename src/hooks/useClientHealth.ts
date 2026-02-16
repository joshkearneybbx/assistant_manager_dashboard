import { useQuery } from '@tanstack/react-query';
import { toDisplayAssistantName } from '../lib/displayName';
import { toNumber, toStringValue } from '../lib/normalize';
import { sql } from '../lib/neon';
import { ClientHealthRow } from '../types';
import { FilterState, shouldLogFilters } from './useFilters';

interface UseClientHealthOptions {
  enabled?: boolean;
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

      let rawRows: Record<string, unknown>[];
      try {
        rawRows = (await sql`
          SELECT *
          FROM v_client_health
          WHERE (${assistantId}::text IS NULL OR assistant_id::text = ${assistantId}::text)
            AND (${familyId}::text IS NULL OR family_id::text = ${familyId}::text)
            AND (${planType}::text IS NULL OR COALESCE(subscription_type, contract)::text = ${planType}::text)
            AND (${status}::text IS NULL OR health_status::text = ${status}::text)
          ORDER BY days_since_last_task DESC
        `) as Record<string, unknown>[];
      } catch {
        rawRows = (await sql`
          SELECT *
          FROM v_client_health
          WHERE (${assistantId}::text IS NULL OR assistant_id::text = ${assistantId}::text)
            AND (${familyId}::text IS NULL OR family_id::text = ${familyId}::text)
            AND (${planType}::text IS NULL OR contract::text = ${planType}::text)
            AND (${status}::text IS NULL OR health_status::text = ${status}::text)
          ORDER BY days_since_last_task DESC
        `) as Record<string, unknown>[];
      }

      return rawRows.map((row) => ({
        family_id: toStringValue(row.family_id),
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
        active_tasks: toNumber(row.active_tasks),
        days_since_last_task: toNumber(row.days_since_last_task),
        health_status: toStringValue(row.health_status, 'Green') as ClientHealthRow['health_status']
      }));
    }
  });
}
