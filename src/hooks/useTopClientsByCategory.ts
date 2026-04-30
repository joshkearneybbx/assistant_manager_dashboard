import { useQuery } from '@tanstack/react-query';
import { sql } from '../lib/neon';
import { toStringValue } from '../lib/normalize';

export interface TopClientsByCategorySourceRow {
  family_id: string;
  client_name: string;
  month: string;
  parent_category: string;
  subcategory: string;
  total_minutes: number;
}

export interface TopClientsByCategorySubcategoryTotal {
  name: string;
  minutes: number;
}

export interface TopClientsByCategoryRow {
  family_id: string;
  client_name: string;
  month: string;
  total_minutes: number;
  tasks_closed: number;
  tasks_closed_team_initiated: number;
  bar_label: string;
  categoryTotals: Record<string, number>;
  subcategoryTotalsByParent: Record<string, TopClientsByCategorySubcategoryTotal[]>;
}

interface ClientTaskCountRow {
  family_id: string;
  tasks_closed: number;
  tasks_closed_team_initiated: number;
}

export function toMonthDateString(value: string | Date): string {
  if (value instanceof Date) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  }

  const match = value.match(/^(\d{4})-(\d{1,2})/);
  if (!match) return value;

  const [, selectedYear, selectedMonth] = match;
  return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
}

function toDateOnlyString(value: unknown): string {
  if (value instanceof Date) return toMonthDateString(value);
  return toMonthDateString(toStringValue(value).slice(0, 10));
}

function toMinutes(value: unknown): number {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toInteger(value: unknown): number {
  const parsed = typeof value === 'number' ? value : parseInt(String(value ?? '0'), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toHoursLabel(minutes: number): string {
  return `${(minutes / 60).toFixed(1)}h`;
}

function toBarLabel(tasksClosed: number, teamInitiatedTasks: number, totalMinutes: number): string {
  const chartTaskCount = Math.max(0, tasksClosed - teamInitiatedTasks);
  const timeLabel = toHoursLabel(totalMinutes);
  if (chartTaskCount <= 0) return timeLabel;
  return `${chartTaskCount} ${chartTaskCount === 1 ? 'task' : 'tasks'} · ${timeLabel}`;
}

function mapCategoryRows(rows: Record<string, unknown>[]): TopClientsByCategorySourceRow[] {
  return rows.map((row) => ({
    family_id: toStringValue(row.family_id),
    client_name: toStringValue(row.client_name),
    month: toDateOnlyString(row.month),
    parent_category: toStringValue(row.parent_category, 'Uncategorized'),
    subcategory: toStringValue(row.subcategory, 'Uncategorized'),
    total_minutes: toMinutes(row.total_minutes)
  }));
}

function mapTaskCountRows(rows: Record<string, unknown>[]): ClientTaskCountRow[] {
  return rows.map((row) => ({
    family_id: toStringValue(row.family_id),
    tasks_closed: toInteger(row.tasks_closed),
    tasks_closed_team_initiated: toInteger(row.tasks_closed_team_initiated)
  }));
}

function shapeClientRows(
  categoryRows: TopClientsByCategorySourceRow[],
  taskCountRows: ClientTaskCountRow[],
  monthStr: string
): TopClientsByCategoryRow[] {
  const taskCountsByClient = taskCountRows.reduce<Record<string, ClientTaskCountRow>>((acc, row) => {
    const existing = acc[row.family_id] ?? {
      family_id: row.family_id,
      tasks_closed: 0,
      tasks_closed_team_initiated: 0
    };

    existing.tasks_closed += row.tasks_closed;
    existing.tasks_closed_team_initiated += row.tasks_closed_team_initiated;
    acc[row.family_id] = existing;
    return acc;
  }, {});

  const clients = new Map<
    string,
    {
      family_id: string;
      client_name: string;
      total_minutes: number;
      categoryTotals: Record<string, number>;
      subcategoryTotals: Record<string, Record<string, number>>;
    }
  >();

  categoryRows.forEach((row) => {
    const familyId = row.family_id || row.client_name;
    const parentCategory = row.parent_category || 'Uncategorized';
    const subcategory = row.subcategory || 'Uncategorized';
    const existing = clients.get(familyId) ?? {
      family_id: familyId,
      client_name: row.client_name || 'Unknown Client',
      total_minutes: 0,
      categoryTotals: {},
      subcategoryTotals: {}
    };

    existing.total_minutes += row.total_minutes;
    existing.categoryTotals[parentCategory] = (existing.categoryTotals[parentCategory] ?? 0) + row.total_minutes;
    existing.subcategoryTotals[parentCategory] = existing.subcategoryTotals[parentCategory] ?? {};
    existing.subcategoryTotals[parentCategory][subcategory] =
      (existing.subcategoryTotals[parentCategory][subcategory] ?? 0) + row.total_minutes;

    clients.set(familyId, existing);
  });

  return Array.from(clients.values()).map((client) => {
    const taskCounts = taskCountsByClient[client.family_id] ?? {
      family_id: client.family_id,
      tasks_closed: 0,
      tasks_closed_team_initiated: 0
    };

    const subcategoryTotalsByParent = Object.entries(client.subcategoryTotals).reduce<
      Record<string, TopClientsByCategorySubcategoryTotal[]>
    >((acc, [category, subcategories]) => {
      acc[category] = Object.entries(subcategories)
        .map(([name, minutes]) => ({ name, minutes }))
        .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name));
      return acc;
    }, {});

    return {
      family_id: client.family_id,
      client_name: client.client_name,
      month: monthStr,
      total_minutes: client.total_minutes,
      tasks_closed: taskCounts.tasks_closed,
      tasks_closed_team_initiated: taskCounts.tasks_closed_team_initiated,
      bar_label: toBarLabel(taskCounts.tasks_closed, taskCounts.tasks_closed_team_initiated, client.total_minutes),
      categoryTotals: client.categoryTotals,
      subcategoryTotalsByParent
    };
  });
}

export function useTopClientsByCategory(month: string | Date) {
  const monthStr = toMonthDateString(month);

  return useQuery<TopClientsByCategoryRow[]>({
    queryKey: ['v_top_clients_by_category', monthStr],
    enabled: Boolean(monthStr),
    queryFn: async () => {
      const [categoryRawRows, taskCountRawRows] = await Promise.all([
        sql`
          SELECT
            family_id::text AS family_id,
            client_name,
            month::date AS month,
            parent_category,
            subcategory,
            total_minutes
          FROM v_top_clients_by_category
          WHERE month = ${monthStr}::date
          ORDER BY client_name, parent_category, subcategory
        `,
        sql`
          SELECT
            family_id::text AS family_id,
            tasks_closed,
            tasks_closed_team_initiated
          FROM v_client_tasks_by_month
          WHERE month = ${monthStr}::date
        `
      ]);

      const categoryRows = mapCategoryRows(categoryRawRows as Record<string, unknown>[]);
      const taskCountRows = mapTaskCountRows(taskCountRawRows as Record<string, unknown>[]);

      return shapeClientRows(categoryRows, taskCountRows, monthStr);
    }
  });
}
