import { useQuery } from '@tanstack/react-query';
import { toDisplayAssistantName } from '../lib/displayName';
import { toNumber, toStringValue } from '../lib/normalize';
import { sql } from '../lib/neon';
import { FohPerformanceRow } from '../types';
import { FilterState, shouldLogFilters } from './useFilters';

export function useFOHPerformance(filters: FilterState) {
  return useQuery<FohPerformanceRow[]>({
    queryKey: ['v_foh_performance', filters],
    queryFn: async () => {
      const assistantId = filters.assistant[0] ?? null;
      const status = filters.status[0] ?? null;

      if (shouldLogFilters) {
        // eslint-disable-next-line no-console
        console.info('[filters:applied][v_foh_performance]', { assistantId, status });
      }

      const rawRows = (await sql`
        SELECT *
        FROM v_foh_performance
        WHERE (${assistantId}::text IS NULL OR assistant_id::text = ${assistantId}::text)
          AND (${status}::text IS NULL OR performance_status::text = ${status}::text)
        ORDER BY avg_mins_per_task DESC
      `) as Record<string, unknown>[];

      return rawRows.map((row) => ({
        assistant_id: toStringValue(row.assistant_id),
        assistant_name: toDisplayAssistantName(toStringValue(row.assistant_name)),
        tasks_completed: toNumber(row.tasks_completed),
        active_tasks: toNumber(row.active_tasks),
        avg_mins_per_task: toNumber(row.avg_mins_per_task),
        client_count: toNumber(row.client_count),
        red_clients: toNumber(row.red_clients),
        amber_clients: toNumber(row.amber_clients),
        performance_status: toStringValue(row.performance_status, 'Green') as FohPerformanceRow['performance_status']
      }));
    }
  });
}
