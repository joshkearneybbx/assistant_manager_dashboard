import { useQuery } from '@tanstack/react-query';
import { toDisplayAssistantName } from '../lib/displayName';
import { toNumber, toStringValue } from '../lib/normalize';
import { sql } from '../lib/neon';
import { TogglDetailRow } from '../types';
import { FilterState, computeDateRange, shouldLogFilters } from './useFilters';

interface UseTogglDetailOptions {
  enabled?: boolean;
}

export function useTogglDetail(filters: FilterState, options?: UseTogglDetailOptions) {
  return useQuery<TogglDetailRow[]>({
    queryKey: ['v_toggl_detail', filters],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const assistantId = filters.assistant[0] ?? null;
      const familyId = filters.client[0] ?? null;
      const range = computeDateRange(filters);

      if (shouldLogFilters) {
        // eslint-disable-next-line no-console
        console.info('[filters:applied][v_toggl_detail]', { assistantId, familyId, range });
      }

      try {
        const rawRows = (await sql`
          SELECT *
          FROM v_toggl_detail
          WHERE (${assistantId}::text IS NULL OR assistant_id::text = ${assistantId}::text)
            AND (${familyId}::text IS NULL OR family_id::text = ${familyId}::text)
            AND entry_date::date >= ${range.from}::date
            AND entry_date::date <= ${range.to}::date
            AND EXISTS (
              SELECT 1
              FROM tasks t
              WHERE t.id::text = task_id::text
                AND (
                  t.source_detailed IS NULL
                  OR t.source_detailed NOT IN ('Engagement', 'Marketing', 'Initiative')
                )
            )
          ORDER BY entry_date DESC
        `) as Record<string, unknown>[];

        return rawRows.map((row) => ({
          entry_id: toStringValue(row.entry_id),
          family_id: toStringValue(row.family_id),
          family_name: toStringValue(row.family_name),
          assistant_id: toStringValue(row.assistant_id),
          assistant_name: toDisplayAssistantName(toStringValue(row.assistant_name)),
          category: row.category == null ? null : toStringValue(row.category),
          minutes: toNumber(row.duration_minutes ?? row.minutes),
          entry_date: toStringValue(row.entry_date)
        }));
      } catch {
        const rawRows = (await sql`
          SELECT *
          FROM v_toggl_detail
          WHERE (${assistantId}::text IS NULL OR assistant_id::text = ${assistantId}::text)
            AND (${familyId}::text IS NULL OR family_id::text = ${familyId}::text)
            AND entry_date::date >= ${range.from}::date
            AND entry_date::date <= ${range.to}::date
            AND EXISTS (
              SELECT 1
              FROM tasks t
              WHERE t.id::text = task_id::text
                AND (
                  t.source_detailed IS NULL
                  OR t.source_detailed NOT IN ('Engagement', 'Marketing', 'Initiative')
                )
            )
          ORDER BY entry_date DESC
        `) as Record<string, unknown>[];

        return rawRows.map((row) => ({
          entry_id: toStringValue(row.entry_id),
          family_id: toStringValue(row.family_id),
          family_name: toStringValue(row.family_name),
          assistant_id: toStringValue(row.assistant_id),
          assistant_name: toDisplayAssistantName(toStringValue(row.assistant_name)),
          category: row.category == null ? null : toStringValue(row.category),
          minutes: toNumber(row.duration_minutes ?? row.minutes),
          entry_date: toStringValue(row.entry_date)
        }));
      }
    }
  });
}
