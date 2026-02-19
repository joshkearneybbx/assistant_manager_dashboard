import { useQuery } from '@tanstack/react-query';
import { toDisplayAssistantName } from '../lib/displayName';
import { toNumber, toStringValue } from '../lib/normalize';
import { sql } from '../lib/neon';
import { FohPerformanceRow } from '../types';
import { FilterState, computeDateRange } from './useFilters';

interface FOHPerformanceDateRange {
  startDate: string;
  endDate: string;
}

function toRangeFromFilters(filters: FilterState): FOHPerformanceDateRange {
  const range = computeDateRange(filters);
  const startDate = `${range.from}T00:00:00.000`;
  const endDate = `${range.to}T23:59:59.999`;
  return { startDate, endDate };
}

function toDateRange(value: FOHPerformanceDateRange | FilterState): FOHPerformanceDateRange {
  if ('startDate' in value && 'endDate' in value) return value;
  return toRangeFromFilters(value);
}

function toPerformanceStatus(avgMinsPerTask: number): FohPerformanceRow['performance_status'] {
  if (avgMinsPerTask === 0) return 'Green';
  if (avgMinsPerTask < 30) return 'Green';
  if (avgMinsPerTask <= 45) return 'Amber';
  return 'Red';
}

export function useFOHPerformance(input: FOHPerformanceDateRange | FilterState) {
  const { startDate, endDate } = toDateRange(input);

  return useQuery<FohPerformanceRow[]>({
    queryKey: ['foh_performance_v2', startDate, endDate],
    queryFn: async () => {
      const rows = (await sql`
        WITH completed AS (
            SELECT
                t.assistant_id,
                COUNT(*) as tasks_completed
            FROM tasks t
            WHERE t.closed_at >= ${startDate} AND t.closed_at <= ${endDate}
            AND t.family_id NOT IN ('recRpXW7Q0aAMnbht', 'recWsSUu7Z7RfCLo9')
            AND (
              t.source_detailed IS NULL
              OR t.source_detailed NOT IN ('Engagement', 'Marketing')
            )
            GROUP BY t.assistant_id
        ),
        toggl_stats AS (
            SELECT
                t.assistant_id,
                ROUND(SUM(te.duration_minutes)::numeric / COUNT(DISTINCT t.id), 1) as avg_mins_per_task
            FROM tasks t
            JOIN toggl_entries te ON te.task_id = t.id
            WHERE t.closed_at >= ${startDate} AND t.closed_at <= ${endDate}
            AND t.family_id NOT IN ('recRpXW7Q0aAMnbht', 'recWsSUu7Z7RfCLo9')
            AND (
              t.source_detailed IS NULL
              OR t.source_detailed NOT IN ('Engagement', 'Marketing')
            )
            GROUP BY t.assistant_id
        ),
        clients AS (
            SELECT
                f.assistant_id,
                COUNT(*) as client_count
            FROM families f
            WHERE f.system_status = '🟢 Active'
            GROUP BY f.assistant_id
        )
        SELECT
            a.id as assistant_id,
            a.name as assistant_name,
            COALESCE(c.tasks_completed, 0) as tasks_completed,
            COALESCE(ts.avg_mins_per_task, 0) as avg_mins_per_task,
            COALESCE(cl.client_count, 0) as client_count
        FROM assistants a
        LEFT JOIN completed c ON c.assistant_id = a.id
        LEFT JOIN toggl_stats ts ON ts.assistant_id = a.id
        LEFT JOIN clients cl ON cl.assistant_id = a.id
        WHERE a.type = 'FOH'
        ORDER BY a.name;
      `) as Record<string, unknown>[];

      return rows.map((row) => {
        const avgMinsPerTask = toNumber(row.avg_mins_per_task);
        return {
          assistant_id: toStringValue(row.assistant_id),
          assistant_name: toDisplayAssistantName(toStringValue(row.assistant_name)),
          tasks_completed: toNumber(row.tasks_completed),
          avg_mins_per_task: avgMinsPerTask,
          client_count: toNumber(row.client_count),
          active_tasks: 0,
          red_clients: 0,
          amber_clients: 0,
          performance_status: toPerformanceStatus(avgMinsPerTask)
        };
      });
    }
  });
}
