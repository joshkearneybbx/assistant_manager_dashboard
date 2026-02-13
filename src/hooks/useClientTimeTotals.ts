import { useQuery } from '@tanstack/react-query';
import { toNumber, toStringValue } from '../lib/normalize';
import { sql } from '../lib/neon';
import { ClientTimeTotalRow } from '../types';
import { FilterState, computeDateRange, shouldLogFilters } from './useFilters';

export function useClientTimeTotals(filters: FilterState) {
  return useQuery<ClientTimeTotalRow[]>({
    queryKey: ['v_client_time_breakdown_totals', filters],
    queryFn: async () => {
      const assistantId = filters.assistant[0] ?? null;
      const familyId = filters.client[0] ?? null;
      const range = computeDateRange(filters);

      if (shouldLogFilters) {
        // eslint-disable-next-line no-console
        console.info('[filters:applied][v_client_time_breakdown_totals]', {
          assistantId,
          familyId,
          range
        });
      }

      try {
        const rows = (await sql`
          SELECT family_id::text AS family_id, family_name, SUM(duration_minutes) AS total_minutes
          FROM v_toggl_detail
          WHERE (${assistantId}::text IS NULL OR assistant_id::text = ${assistantId}::text)
            AND (${familyId}::text IS NULL OR family_id::text = ${familyId}::text)
            AND entry_date::date >= ${range.from}::date
            AND entry_date::date <= ${range.to}::date
          GROUP BY family_id, family_name
        `) as Record<string, unknown>[];

        return rows.map((row) => ({
          family_id: toStringValue(row.family_id),
          family_name: toStringValue(row.family_name),
          total_minutes: toNumber(row.total_minutes)
        }));
      } catch {
        const fallbackRows = (await sql`
          SELECT family_id::text AS family_id, family_name, SUM(minutes) AS total_minutes
          FROM v_toggl_detail
          WHERE (${assistantId}::text IS NULL OR assistant_id::text = ${assistantId}::text)
            AND (${familyId}::text IS NULL OR family_id::text = ${familyId}::text)
            AND entry_date::date >= ${range.from}::date
            AND entry_date::date <= ${range.to}::date
          GROUP BY family_id, family_name
        `) as Record<string, unknown>[];

        return fallbackRows.map((row) => ({
          family_id: toStringValue(row.family_id),
          family_name: toStringValue(row.family_name),
          total_minutes: toNumber(row.total_minutes)
        }));
      }
    }
  });
}
