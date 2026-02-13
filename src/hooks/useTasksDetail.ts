import { useQuery } from '@tanstack/react-query';
import { toStringValue } from '../lib/normalize';
import { sql } from '../lib/neon';
import { TaskDetailRow } from '../types';
import { FilterState, computeDateRange, shouldLogFilters } from './useFilters';

export function useTasksDetail(filters: FilterState) {
  return useQuery<TaskDetailRow[]>({
    queryKey: ['v_tasks_detail', filters],
    queryFn: async () => {
      const assistantId = filters.assistant[0] ?? null;
      const familyId = filters.client[0] ?? null;
      const range = computeDateRange(filters);

      if (shouldLogFilters) {
        // eslint-disable-next-line no-console
        console.info('[filters:applied][v_tasks_detail]', { assistantId, familyId, range });
      }

      const rawRows = (await sql`
        SELECT *
        FROM v_tasks_detail
        WHERE (${assistantId}::text IS NULL OR assistant_id::text = ${assistantId}::text)
          AND (${familyId}::text IS NULL OR family_id::text = ${familyId}::text)
          AND closed_date::date >= ${range.from}::date
          AND closed_date::date <= ${range.to}::date
        ORDER BY closed_date DESC
      `) as Record<string, unknown>[];

      return rawRows.map((row) => ({
        task_id: toStringValue(row.task_id),
        family_id: toStringValue(row.family_id),
        family_name: toStringValue(row.family_name),
        assistant_id: toStringValue(row.assistant_id),
        assistant_name: toStringValue(row.assistant_name),
        task_title: toStringValue(row.task_title),
        category: row.category == null ? null : toStringValue(row.category),
        closed_date: row.closed_date == null ? null : toStringValue(row.closed_date),
        created_at: toStringValue(row.created_at)
      }));
    }
  });
}
