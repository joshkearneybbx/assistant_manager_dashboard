import { useQuery } from '@tanstack/react-query';
import { toNumber, toStringValue } from '../lib/normalize';
import { sql } from '../lib/neon';
import { FlexUsageRow } from '../types';

export function useFlexUsage() {
  return useQuery<FlexUsageRow[]>({
    queryKey: ['flex_usage'],
    queryFn: async () => {
      const rows = (await sql`
        SELECT
            f.id::text as family_id,
            COUNT(t.id) FILTER (
                WHERE t.closed_at IS NOT NULL
                AND t.created_at >= f.flex_start_date
                AND (
                  t.source_detailed IS NULL
                  OR t.source_detailed NOT IN ('Engagement', 'Marketing', 'Initiative')
                )
            ) as flex_tasks_used
        FROM families f
        LEFT JOIN tasks t ON t.family_id::text = f.id::text
        WHERE f.contract = 'BlckBx Flex'
        AND f.flex_start_date IS NOT NULL
        GROUP BY f.id::text
      `) as Record<string, unknown>[];

      return rows.map((row) => ({
        family_id: toStringValue(row.family_id),
        flex_tasks_used: toNumber(row.flex_tasks_used)
      }));
    }
  });
}
