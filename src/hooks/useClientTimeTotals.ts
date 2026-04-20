import { useQuery } from '@tanstack/react-query';
import { toNumber, toStringValue } from '../lib/normalize';
import { sql } from '../lib/neon';
import { ClientTimeTotalRow } from '../types';
import { FilterState, computeDateRange, shouldLogFilters } from './useFilters';

function mapRows(rows: Record<string, unknown>[]): ClientTimeTotalRow[] {
  return rows.map((row) => ({
    family_id: toStringValue(row.family_id),
    family_name: toStringValue(row.family_name),
    total_minutes: toNumber(row.total_minutes),
    foh_minutes: toNumber(row.foh_minutes),
    boh_minutes: toNumber(row.boh_minutes)
  }));
}

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

      let rawRows: Record<string, unknown>[];

      try {
        rawRows = (await sql`
          SELECT
            COALESCE(t.family_id::text, tp.family_id::text) AS family_id,
            COALESCE(ch.family_name, '') AS family_name,
            ROUND(SUM(te.duration_minutes) FILTER (WHERE a_te.type = 'FOH')::numeric, 1) AS foh_minutes,
            ROUND(SUM(te.duration_minutes) FILTER (WHERE a_te.type = 'BOH')::numeric, 1) AS boh_minutes,
            ROUND(SUM(te.duration_minutes)::numeric, 1) AS total_minutes
          FROM toggl_entries te
          LEFT JOIN tasks t ON te.task_id = t.id
          LEFT JOIN toggl_projects tp ON te.toggl_project_id = tp.toggl_project_id
          LEFT JOIN assistants a_te ON te.assistant_id = a_te.id
          LEFT JOIN (
            SELECT DISTINCT family_id::text AS family_id, family_name
            FROM v_client_health
            WHERE family_id::text NOT IN ('recRpXW7Q0aAMnbht', 'recWsSUu7Z7RfCLo9', 'recVjs2tfhrs6wPyQ', 'recxXHObMiPAJk5yn')
          ) ch ON ch.family_id = COALESCE(t.family_id::text, tp.family_id::text)
          WHERE (${familyId}::text IS NULL OR COALESCE(t.family_id::text, tp.family_id::text) = ${familyId}::text)
            AND COALESCE(t.family_id::text, tp.family_id::text) IS NOT NULL
            AND COALESCE(t.family_id::text, tp.family_id::text) NOT IN ('recRpXW7Q0aAMnbht', 'recWsSUu7Z7RfCLo9', 'recVjs2tfhrs6wPyQ', 'recxXHObMiPAJk5yn')
            AND te.start_time::date >= ${range.from}::date
            AND te.start_time::date <= ${range.to}::date
            AND (
              t.source_detailed IS NULL
              OR t.source_detailed NOT IN ('Engagement', 'Marketing')
            )
          GROUP BY COALESCE(t.family_id::text, tp.family_id::text), ch.family_name
        `) as Record<string, unknown>[];
      } catch {
        try {
          rawRows = (await sql`
            SELECT
              COALESCE(t.family_id::text, tp.family_id::text) AS family_id,
              COALESCE(ch.family_name, '') AS family_name,
              ROUND(SUM(te.duration_minutes) FILTER (WHERE a_te.type = 'FOH')::numeric, 1) AS foh_minutes,
              ROUND(SUM(te.duration_minutes) FILTER (WHERE a_te.type = 'BOH')::numeric, 1) AS boh_minutes,
              ROUND(SUM(te.duration_minutes)::numeric, 1) AS total_minutes
            FROM toggl_entries te
            LEFT JOIN tasks t ON te.task_id = t.id
            LEFT JOIN toggl_projects tp ON te.toggl_project_id = tp.toggl_project_id
            LEFT JOIN assistants a_te ON te.assistant_id = a_te.id
            LEFT JOIN (
              SELECT DISTINCT family_id::text AS family_id, family_name
              FROM v_client_health
              WHERE family_id::text NOT IN ('recRpXW7Q0aAMnbht', 'recWsSUu7Z7RfCLo9', 'recVjs2tfhrs6wPyQ', 'recxXHObMiPAJk5yn')
            ) ch ON ch.family_id = COALESCE(t.family_id::text, tp.family_id::text)
            WHERE (${familyId}::text IS NULL OR COALESCE(t.family_id::text, tp.family_id::text) = ${familyId}::text)
              AND COALESCE(t.family_id::text, tp.family_id::text) IS NOT NULL
              AND COALESCE(t.family_id::text, tp.family_id::text) NOT IN ('recRpXW7Q0aAMnbht', 'recWsSUu7Z7RfCLo9', 'recVjs2tfhrs6wPyQ', 'recxXHObMiPAJk5yn')
              AND te.entry_date::date >= ${range.from}::date
              AND te.entry_date::date <= ${range.to}::date
              AND (
                t.source_detailed IS NULL
                OR t.source_detailed NOT IN ('Engagement', 'Marketing')
              )
            GROUP BY COALESCE(t.family_id::text, tp.family_id::text), ch.family_name
          `) as Record<string, unknown>[];
        } catch {
          rawRows = (await sql`
            SELECT
              COALESCE(t.family_id::text, tp.family_id::text) AS family_id,
              COALESCE(ch.family_name, '') AS family_name,
              ROUND(SUM(te.duration_minutes) FILTER (WHERE a_te.type = 'FOH')::numeric, 1) AS foh_minutes,
              ROUND(SUM(te.duration_minutes) FILTER (WHERE a_te.type = 'BOH')::numeric, 1) AS boh_minutes,
              ROUND(SUM(te.duration_minutes)::numeric, 1) AS total_minutes
            FROM toggl_entries te
            LEFT JOIN tasks t ON te.task_id = t.id
            LEFT JOIN toggl_projects tp ON te.toggl_project_id = tp.toggl_project_id
            LEFT JOIN assistants a_te ON te.assistant_id = a_te.id
            LEFT JOIN (
              SELECT DISTINCT family_id::text AS family_id, family_name
              FROM v_client_health
              WHERE family_id::text NOT IN ('recRpXW7Q0aAMnbht', 'recWsSUu7Z7RfCLo9', 'recVjs2tfhrs6wPyQ', 'recxXHObMiPAJk5yn')
            ) ch ON ch.family_id = COALESCE(t.family_id::text, tp.family_id::text)
            WHERE (${familyId}::text IS NULL OR COALESCE(t.family_id::text, tp.family_id::text) = ${familyId}::text)
              AND COALESCE(t.family_id::text, tp.family_id::text) IS NOT NULL
              AND COALESCE(t.family_id::text, tp.family_id::text) NOT IN ('recRpXW7Q0aAMnbht', 'recWsSUu7Z7RfCLo9', 'recVjs2tfhrs6wPyQ', 'recxXHObMiPAJk5yn')
              AND te.date::date >= ${range.from}::date
              AND te.date::date <= ${range.to}::date
              AND (
                t.source_detailed IS NULL
                OR t.source_detailed NOT IN ('Engagement', 'Marketing')
              )
            GROUP BY COALESCE(t.family_id::text, tp.family_id::text), ch.family_name
          `) as Record<string, unknown>[];
        }
      }

      if (shouldLogFilters) {
        // eslint-disable-next-line no-console
        console.info('[v_client_time_breakdown_totals:raw]', {
          count: rawRows.length,
          sample: rawRows.slice(0, 5)
        });
      }

      return mapRows(rawRows);
    }
  });
}
