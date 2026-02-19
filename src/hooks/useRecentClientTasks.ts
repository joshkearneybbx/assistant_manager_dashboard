import { useQuery } from '@tanstack/react-query';
import { toStringValue } from '../lib/normalize';
import { sql } from '../lib/neon';
import { RecentClientTaskRow } from '../types';

export function useRecentClientTasks(familyId?: string) {
  return useQuery<RecentClientTaskRow[]>({
    queryKey: ['recent_client_tasks', familyId],
    enabled: Boolean(familyId),
    queryFn: async () => {
      const rows = (await sql`
        SELECT title, category, task_state, created_at, closed_at
        FROM tasks
        WHERE family_id = ${familyId}
          AND (
            source_detailed IS NULL
            OR source_detailed NOT IN ('Engagement', 'Marketing')
          )
        ORDER BY created_at DESC
        LIMIT 5
      `) as Record<string, unknown>[];

      return rows.map((row) => ({
        title: toStringValue(row.title),
        category: row.category == null ? null : toStringValue(row.category),
        task_state: toStringValue(row.task_state),
        created_at: toStringValue(row.created_at),
        closed_at: row.closed_at == null ? null : toStringValue(row.closed_at)
      }));
    }
  });
}
