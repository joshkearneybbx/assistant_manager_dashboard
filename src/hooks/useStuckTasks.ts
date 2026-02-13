import { useQuery } from '@tanstack/react-query';
import { toDisplayAssistantName } from '../lib/displayName';
import { toNumber, toStringValue } from '../lib/normalize';
import { sql } from '../lib/neon';
import { StuckTaskRow } from '../types';
import { FilterState, shouldLogFilters } from './useFilters';

export function useStuckTasks(filters: FilterState, taskStatus: string = 'all') {
  return useQuery<StuckTaskRow[]>({
    queryKey: ['v_stuck_tasks', filters, taskStatus],
    queryFn: async () => {
      const assistantId = filters.assistant[0] ?? null;
      const familyId = filters.client[0] ?? null;
      const normalizeTaskStatus = (value: string) => value.replace(/^\d+(\.\d+)?\.\s*/, '').trim();
      const selectedStatus = taskStatus === 'all' ? null : normalizeTaskStatus(taskStatus);

      if (shouldLogFilters) {
        // eslint-disable-next-line no-console
        console.info('[filters:applied][v_stuck_tasks]', {
          assistantId,
          familyId,
          selectedStatus
        });
      }

      const rawRows = (await sql`
        SELECT
          st.*,
          (
            SELECT a.id::text
            FROM assistants a
            WHERE a.name = st.assistant_name
            LIMIT 1
          ) AS assistant_id,
          (
            SELECT ch.family_id::text
            FROM v_client_health ch
            WHERE ch.family_name = st.family_name
            LIMIT 1
          ) AS family_id
        FROM v_stuck_tasks st
        WHERE (
            ${assistantId}::text IS NULL
            OR EXISTS (
              SELECT 1
              FROM assistants a
              WHERE a.id::text = ${assistantId}::text
                AND a.name = st.assistant_name
            )
          )
          AND (
            ${familyId}::text IS NULL
            OR EXISTS (
              SELECT 1
              FROM v_client_health ch
              WHERE ch.family_id::text = ${familyId}::text
                AND ch.family_name = st.family_name
            )
          )
          AND (
            ${selectedStatus}::text IS NULL
            OR REGEXP_REPLACE(st.task_status, '^\\d+(\\.\\d+)?\\.\\s*', '') = ${selectedStatus}::text
          )
        ORDER BY st.days_since_update DESC
      `) as Record<string, unknown>[];

      return rawRows.map((row) => ({
        task_id: toStringValue(row.task_id),
        task_title: toStringValue(row.task_title),
        family_id: toStringValue(row.family_id),
        family_name: toStringValue(row.family_name),
        assistant_id: toStringValue(row.assistant_id),
        assistant_name: toDisplayAssistantName(toStringValue(row.assistant_name)),
        days_since_update: toNumber(row.days_since_update ?? row.days_open),
        task_state: toStringValue(row.task_state),
        task_status: toStringValue(row.task_status ?? row.task_state),
        category: row.category == null ? null : toStringValue(row.category),
        stuck_status: toStringValue(row.stuck_status, 'Stuck') as StuckTaskRow['stuck_status']
      }));
    }
  });
}
