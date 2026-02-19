import { useQuery } from '@tanstack/react-query';
import { toDisplayAssistantName } from '../lib/displayName';
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
        SELECT
          t.id::text AS task_id,
          t.family_id::text AS family_id,
          COALESCE(ch.family_name, '') AS family_name,
          t.assistant_id::text AS assistant_id,
          COALESCE(a.name, '') AS assistant_name,
          t.title AS task_title,
          t.category,
          t.closed_at::date AS closed_date,
          t.created_at
        FROM tasks t
        LEFT JOIN (
          SELECT DISTINCT family_id::text AS family_id, family_name
          FROM v_client_health
        ) ch ON ch.family_id = t.family_id::text
        LEFT JOIN assistants a ON a.id::text = t.assistant_id::text
        WHERE (${assistantId}::text IS NULL OR t.assistant_id::text = ${assistantId}::text)
          AND (${familyId}::text IS NULL OR t.family_id::text = ${familyId}::text)
          AND t.closed_at IS NOT NULL
          AND t.closed_at::date >= ${range.from}::date
          AND t.closed_at::date <= ${range.to}::date
          AND (
            t.source_detailed IS NULL
            OR t.source_detailed NOT IN ('Engagement', 'Marketing')
          )
        ORDER BY t.closed_at DESC
      `) as Record<string, unknown>[];

      return rawRows.map((row) => ({
        task_id: toStringValue(row.task_id),
        family_id: toStringValue(row.family_id),
        family_name: toStringValue(row.family_name),
        assistant_id: toStringValue(row.assistant_id),
        assistant_name: toDisplayAssistantName(toStringValue(row.assistant_name)),
        task_title: toStringValue(row.task_title),
        category: row.category == null ? null : toStringValue(row.category),
        closed_date: row.closed_date == null ? null : toStringValue(row.closed_date),
        created_at: toStringValue(row.created_at)
      }));
    }
  });
}
