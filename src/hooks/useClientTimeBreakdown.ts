import { useQuery } from '@tanstack/react-query';
import { toNumber, toStringValue } from '../lib/normalize';
import { sql } from '../lib/neon';
import { ClientTimeBreakdownRow } from '../types';
import { FilterState, computeDateRange, shouldLogFilters } from './useFilters';

export function useClientTimeBreakdown(filters: FilterState, familyId?: string) {
  return useQuery<ClientTimeBreakdownRow[]>({
    queryKey: ['v_client_time_breakdown', filters, familyId],
    enabled: Boolean(familyId),
    queryFn: async () => {
      const range = computeDateRange(filters);

      if (shouldLogFilters) {
        // eslint-disable-next-line no-console
        console.info('[filters:applied][v_client_time_breakdown]', { familyId, range });
      }

      try {
        const rawRows = (await sql`
          SELECT
            family_id::text AS family_id,
            category,
            SUM(duration_minutes) AS minutes
          FROM v_toggl_detail
          WHERE family_id::text = ${familyId}::text
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
          GROUP BY family_id, category
          ORDER BY minutes DESC
        `) as Record<string, unknown>[];

        return rawRows.map((row) => ({
          family_id: toStringValue(row.family_id),
          category: toStringValue(row.category),
          minutes: toNumber(row.minutes)
        }));
      } catch {
        const fallbackRows = (await sql`
          SELECT
            family_id::text AS family_id,
            category,
            SUM(minutes) AS minutes
          FROM v_toggl_detail
          WHERE family_id::text = ${familyId}::text
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
          GROUP BY family_id, category
          ORDER BY minutes DESC
        `) as Record<string, unknown>[];

        return fallbackRows.map((row) => ({
          family_id: toStringValue(row.family_id),
          category: toStringValue(row.category),
          minutes: toNumber(row.minutes)
        }));
      }
    }
  });
}
