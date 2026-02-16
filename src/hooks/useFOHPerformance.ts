import { useQuery } from '@tanstack/react-query';
import { toDisplayAssistantName } from '../lib/displayName';
import { toNumber, toStringValue } from '../lib/normalize';
import { sql } from '../lib/neon';
import { FohPerformanceRow } from '../types';
import { FilterState, computeDateRange, shouldLogFilters } from './useFilters';

export function useFOHPerformance(filters: FilterState) {
  return useQuery<FohPerformanceRow[]>({
    queryKey: ['v_foh_performance', filters],
    queryFn: async () => {
      const assistantId = filters.assistant[0] ?? null;
      const status = filters.status[0] ?? null;
      const range = computeDateRange(filters);
      const startDate = filters.period === 'all_time' ? '2020-01-01' : range.from;
      const endDate = filters.period === 'all_time' ? new Date().toISOString().slice(0, 10) : range.to;

      if (shouldLogFilters) {
        // eslint-disable-next-line no-console
        console.info('[filters:applied][foh_performance_raw]', {
          assistantId,
          status,
          range: { from: startDate, to: endDate }
        });
      }

      let rawRows: Record<string, unknown>[];
      try {
        rawRows = (await sql`
          WITH completed AS (
            SELECT
              t.assistant_id::text AS assistant_id,
              COUNT(*) AS tasks_completed
            FROM tasks t
            WHERE t.closed_at::date >= ${startDate}::date
              AND t.closed_at::date <= ${endDate}::date
              AND t.closed_at IS NOT NULL
              AND t.family_id NOT IN ('recRpXW7Q0aAMnbht', 'recWsSUu7Z7RfCLo9')
            GROUP BY t.assistant_id
          ),
          active AS (
            SELECT
              t.assistant_id::text AS assistant_id,
              COUNT(*) AS active_tasks
            FROM tasks t
            WHERE t.closed_at IS NULL
              AND t.task_state IN ('Active', 'Delayed', 'New', 'Not Started')
              AND (
                t.task_status IS NULL
                OR t.task_status NOT IN ('4. Done', '7. Cancelled', '8. Redundant')
              )
              AND t.family_id NOT IN ('recRpXW7Q0aAMnbht', 'recWsSUu7Z7RfCLo9')
            GROUP BY t.assistant_id
          ),
          toggl_stats AS (
            SELECT
              t.assistant_id::text AS assistant_id,
              SUM(te.duration_minutes) AS total_minutes,
              COUNT(DISTINCT t.id) AS tasks_with_time
            FROM tasks t
            JOIN toggl_entries te ON te.task_id = t.id
            WHERE t.closed_at::date >= ${startDate}::date
              AND t.closed_at::date <= ${endDate}::date
              AND t.closed_at IS NOT NULL
              AND t.family_id NOT IN ('recRpXW7Q0aAMnbht', 'recWsSUu7Z7RfCLo9')
            GROUP BY t.assistant_id
          ),
          clients AS (
            SELECT
              f.assistant_id::text AS assistant_id,
              COUNT(*) AS client_count
            FROM families f
            WHERE f.system_status = '🟢 Active'
            GROUP BY f.assistant_id
          ),
          health AS (
            SELECT
              ch.assistant_id::text AS assistant_id,
              COUNT(DISTINCT ch.family_id) FILTER (WHERE ch.health_status = 'Red') AS red_clients,
              COUNT(DISTINCT ch.family_id) FILTER (WHERE ch.health_status = 'Amber') AS amber_clients
            FROM v_client_health ch
            GROUP BY ch.assistant_id
          ),
          final AS (
            SELECT
              a.id::text AS assistant_id,
              a.name AS assistant_name,
              COALESCE(c.tasks_completed, 0) AS tasks_completed,
              COALESCE(ac.active_tasks, 0) AS active_tasks,
              COALESCE(
                ROUND(ts.total_minutes::numeric / NULLIF(ts.tasks_with_time, 0), 1),
                0
              ) AS avg_mins_per_task,
              COALESCE(cl.client_count, 0) AS client_count,
              COALESCE(h.red_clients, 0) AS red_clients,
              COALESCE(h.amber_clients, 0) AS amber_clients,
              CASE
                WHEN COALESCE(h.red_clients, 0) > 0 THEN 'Red'
                WHEN COALESCE(h.amber_clients, 0) > 0 THEN 'Amber'
                ELSE 'Green'
              END AS performance_status
            FROM assistants a
            LEFT JOIN completed c ON c.assistant_id = a.id::text
            LEFT JOIN active ac ON ac.assistant_id = a.id::text
            LEFT JOIN toggl_stats ts ON ts.assistant_id = a.id::text
            LEFT JOIN clients cl ON cl.assistant_id = a.id::text
            LEFT JOIN health h ON h.assistant_id = a.id::text
            WHERE a.type = 'FOH'
              AND (${assistantId}::text IS NULL OR a.id::text = ${assistantId}::text)
          )
          SELECT *
          FROM final
          WHERE (${status}::text IS NULL OR performance_status::text = ${status}::text)
          ORDER BY assistant_name ASC
        `) as Record<string, unknown>[];
      } catch {
        rawRows = (await sql`
          WITH completed AS (
            SELECT
              t.assistant_id::text AS assistant_id,
              COUNT(*) AS tasks_completed
            FROM tasks t
            WHERE t.closed_at::date >= ${startDate}::date
              AND t.closed_at::date <= ${endDate}::date
              AND t.closed_at IS NOT NULL
              AND t.family_id NOT IN ('recRpXW7Q0aAMnbht', 'recWsSUu7Z7RfCLo9')
            GROUP BY t.assistant_id
          ),
          active AS (
            SELECT
              t.assistant_id::text AS assistant_id,
              COUNT(*) AS active_tasks
            FROM tasks t
            WHERE t.closed_at IS NULL
              AND t.task_state IN ('Active', 'Delayed', 'New', 'Not Started')
              AND (
                t.task_status IS NULL
                OR t.task_status NOT IN ('4. Done', '7. Cancelled', '8. Redundant')
              )
              AND t.family_id NOT IN ('recRpXW7Q0aAMnbht', 'recWsSUu7Z7RfCLo9')
            GROUP BY t.assistant_id
          ),
          toggl_stats AS (
            SELECT
              t.assistant_id::text AS assistant_id,
              SUM(te.minutes) AS total_minutes,
              COUNT(DISTINCT t.id) AS tasks_with_time
            FROM tasks t
            JOIN toggl_entries te ON te.task_id = t.id
            WHERE t.closed_at::date >= ${startDate}::date
              AND t.closed_at::date <= ${endDate}::date
              AND t.closed_at IS NOT NULL
              AND t.family_id NOT IN ('recRpXW7Q0aAMnbht', 'recWsSUu7Z7RfCLo9')
            GROUP BY t.assistant_id
          ),
          clients AS (
            SELECT
              f.assistant_id::text AS assistant_id,
              COUNT(*) AS client_count
            FROM families f
            WHERE f.system_status = '🟢 Active'
            GROUP BY f.assistant_id
          ),
          health AS (
            SELECT
              ch.assistant_id::text AS assistant_id,
              COUNT(DISTINCT ch.family_id) FILTER (WHERE ch.health_status = 'Red') AS red_clients,
              COUNT(DISTINCT ch.family_id) FILTER (WHERE ch.health_status = 'Amber') AS amber_clients
            FROM v_client_health ch
            GROUP BY ch.assistant_id
          ),
          final AS (
            SELECT
              a.id::text AS assistant_id,
              a.name AS assistant_name,
              COALESCE(c.tasks_completed, 0) AS tasks_completed,
              COALESCE(ac.active_tasks, 0) AS active_tasks,
              COALESCE(
                ROUND(ts.total_minutes::numeric / NULLIF(ts.tasks_with_time, 0), 1),
                0
              ) AS avg_mins_per_task,
              COALESCE(cl.client_count, 0) AS client_count,
              COALESCE(h.red_clients, 0) AS red_clients,
              COALESCE(h.amber_clients, 0) AS amber_clients,
              CASE
                WHEN COALESCE(h.red_clients, 0) > 0 THEN 'Red'
                WHEN COALESCE(h.amber_clients, 0) > 0 THEN 'Amber'
                ELSE 'Green'
              END AS performance_status
            FROM assistants a
            LEFT JOIN completed c ON c.assistant_id = a.id::text
            LEFT JOIN active ac ON ac.assistant_id = a.id::text
            LEFT JOIN toggl_stats ts ON ts.assistant_id = a.id::text
            LEFT JOIN clients cl ON cl.assistant_id = a.id::text
            LEFT JOIN health h ON h.assistant_id = a.id::text
            WHERE a.type = 'FOH'
              AND (${assistantId}::text IS NULL OR a.id::text = ${assistantId}::text)
          )
          SELECT *
          FROM final
          WHERE (${status}::text IS NULL OR performance_status::text = ${status}::text)
          ORDER BY assistant_name ASC
        `) as Record<string, unknown>[];
      }

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
