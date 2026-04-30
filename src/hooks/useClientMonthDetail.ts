import { useQuery } from '@tanstack/react-query';
import { sql } from '../lib/neon';
import { toStringValue } from '../lib/normalize';
import { toMonthDateString } from './useTopClientsByCategory';

export interface ClientMonthDetailRow {
  family_id: string;
  month: string;
  reference: string;
  title: string;
  parent_category: string;
  subcategory: string;
  source_detailed: string;
  complexity: string;
  foh_assistant_name: string;
  total_minutes: number;
  foh_minutes: number;
  boh_minutes: number;
  closed_at: string;
}

function toMinutes(value: unknown): number {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDateOnlyString(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return toStringValue(value).slice(0, 10);
}

function toDateTimeString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return toStringValue(value);
}

function mapRows(rows: Record<string, unknown>[]): ClientMonthDetailRow[] {
  return rows.map((row) => ({
    family_id: toStringValue(row.family_id),
    month: toDateOnlyString(row.month),
    reference: toStringValue(row.reference),
    title: toStringValue(row.title),
    parent_category: toStringValue(row.parent_category, 'Uncategorized'),
    subcategory: toStringValue(row.subcategory, 'Uncategorized'),
    source_detailed: toStringValue(row.source_detailed, 'Unknown'),
    complexity: toStringValue(row.complexity),
    foh_assistant_name: toStringValue(row.foh_assistant_name),
    total_minutes: toMinutes(row.total_minutes),
    foh_minutes: toMinutes(row.foh_minutes),
    boh_minutes: toMinutes(row.boh_minutes),
    closed_at: toDateTimeString(row.closed_at)
  }));
}

export function useClientMonthDetail(familyId: string | null | undefined, month: string | Date | null | undefined) {
  const monthStr = month ? toMonthDateString(month) : '';

  return useQuery<ClientMonthDetailRow[]>({
    queryKey: ['v_client_month_task_detail', familyId, monthStr],
    enabled: Boolean(familyId && monthStr),
    queryFn: async () => {
      const rows = (await sql`
        SELECT *
        FROM v_client_month_task_detail
        WHERE family_id::text = ${familyId}::text
          AND month = ${monthStr}::date
        ORDER BY closed_at DESC
      `) as Record<string, unknown>[];

      return mapRows(rows);
    }
  });
}
