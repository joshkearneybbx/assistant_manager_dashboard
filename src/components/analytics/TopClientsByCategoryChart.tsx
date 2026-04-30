import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTopClientsByCategory, type TopClientsByCategoryRow } from '../../hooks/useTopClientsByCategory';
import { formatDuration } from '../../lib/format';
import { ClientMonthDetailModal } from './ClientMonthDetailModal';
import { ErrorState } from '../ui/ErrorState';

const CATEGORY_COLOURS = [
  '#274346',
  '#0D6B58',
  '#F4A85B',
  '#E9722F',
  '#6D5BD0',
  '#2F80ED',
  '#B91C1C',
  '#8A5A44',
  '#00A6A6',
  '#9A3400'
];

const selectBase =
  'h-10 appearance-none rounded-md border border-sand-300 bg-white bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2716%27%20height%3D%2716%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27%23696968%27%20stroke-width%3D%272%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpath%20d%3D%27m6%209%206%206%206-6%27/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_8px_center] bg-no-repeat pl-3 pr-8 text-sm text-base-black focus:border-assistant-dark focus:outline-none focus:ring-2 focus:ring-assistant-dark/20';

interface MonthOption {
  label: string;
  value: string;
}

type TopClientsChartRow = Pick<
  TopClientsByCategoryRow,
  | 'family_id'
  | 'client_name'
  | 'total_minutes'
  | 'tasks_closed'
  | 'tasks_closed_team_initiated'
  | 'bar_label'
  | 'subcategoryTotalsByParent'
> &
  Record<string, unknown>;

interface SelectedClient {
  family_id: string;
  client_name: string;
  total_minutes: number;
  tasks_closed_team_initiated: number;
}

interface ShapedChartData {
  chartData: TopClientsChartRow[];
  categories: string[];
  categoryColours: Record<string, string>;
}

const monthFormatter = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric'
});

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function monthValueFromDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-01`;
}

function parseMonthValue(month: string): Date {
  const [year, monthIndex] = month.split('-').map(Number);
  return new Date(year, (monthIndex || 1) - 1, 1);
}

function formatMonth(month: string): string {
  return monthFormatter.format(parseMonthValue(month));
}

function defaultMonthValue(): string {
  const date = new Date();
  if (date.getDate() <= 2) {
    date.setMonth(date.getMonth() - 1);
  }
  return monthValueFromDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

function getMonthOptions(anchorMonth: string): MonthOption[] {
  const anchor = parseMonthValue(anchorMonth);
  return Array.from({ length: 12 }, (_, index) => {
    const optionDate = new Date(anchor.getFullYear(), anchor.getMonth() - index, 1);
    const value = monthValueFromDate(optionDate);
    return { value, label: formatMonth(value) };
  });
}

function shapeChartData(rows: TopClientsByCategoryRow[], topN: number): ShapedChartData {
  const topClients = [...rows]
    .sort((a, b) => b.total_minutes - a.total_minutes || a.client_name.localeCompare(b.client_name))
    .slice(0, topN);

  const categories = Array.from(
    new Set(
      topClients.flatMap((client) =>
        Object.entries(client.categoryTotals)
          .filter(([, minutes]) => minutes > 0)
          .map(([category]) => category)
      )
    )
  ).sort((a, b) => a.localeCompare(b));

  const categoryColours = categories.reduce<Record<string, string>>((acc, category, index) => {
    acc[category] = CATEGORY_COLOURS[index % CATEGORY_COLOURS.length];
    return acc;
  }, {});

  const chartData = topClients.map<TopClientsChartRow>((client) => {
    const row: TopClientsChartRow = {
      family_id: client.family_id,
      client_name: client.client_name,
      total_minutes: client.total_minutes,
      tasks_closed: client.tasks_closed,
      tasks_closed_team_initiated: client.tasks_closed_team_initiated,
      bar_label: client.bar_label,
      subcategoryTotalsByParent: client.subcategoryTotalsByParent
    };

    categories.forEach((category) => {
      row[category] = client.categoryTotals[category] ?? 0;
    });

    return row;
  });

  return { chartData, categories, categoryColours };
}

function minutesValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function CustomTooltip({
  active,
  payload,
  categories,
  categoryColours,
  hoveredCategory
}: {
  active?: boolean;
  payload?: Array<{ payload?: TopClientsChartRow }>;
  categories: string[];
  categoryColours: Record<string, string>;
  hoveredCategory: string | null;
}) {
  if (!active || !payload?.length) return null;

  const row = payload[0].payload;
  if (!row) return null;

  const activeCategory =
    hoveredCategory && minutesValue(row[hoveredCategory]) > 0
      ? hoveredCategory
      : categories.find((category) => minutesValue(row[category]) > 0);

  const subcategories = activeCategory ? row.subcategoryTotalsByParent[activeCategory] ?? [] : [];
  const otherCategories = categories
    .filter((category) => category !== activeCategory)
    .map((category) => ({ category, minutes: minutesValue(row[category]) }))
    .filter((entry) => entry.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes || a.category.localeCompare(b.category));

  return (
    <div className="min-w-64 rounded-lg border border-sand-300 bg-white px-3 py-2 shadow-sm">
      <div className="text-sm font-semibold text-base-black">{row.client_name}</div>
      <div className="mt-0.5 text-xs text-grey-400">Total: {formatDuration(row.total_minutes)}</div>

      {activeCategory && (
        <div className="mt-3">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-base-black">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: categoryColours[activeCategory] }} />
            <span>{activeCategory}</span>
          </div>
          <div className="space-y-1">
            {subcategories.map((subcategory) => (
              <div key={subcategory.name} className="flex items-center justify-between gap-4 text-xs text-base-black">
                <span>{subcategory.name}</span>
                <span className="tabular-nums">{formatDuration(subcategory.minutes)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {otherCategories.length > 0 && (
        <div className="mt-3 border-t border-sand-300 pt-2">
          <div className="space-y-1">
            {otherCategories.map((entry) => (
              <div key={entry.category} className="flex items-center justify-between gap-4 text-xs text-grey-400">
                <span>{entry.category}</span>
                <span className="tabular-nums">{formatDuration(entry.minutes)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getChartRowFromEvent(data: unknown): TopClientsChartRow | null {
  if (!data || typeof data !== 'object' || !('payload' in data)) return null;
  return (data as { payload?: TopClientsChartRow }).payload ?? null;
}

function ClientYAxisTick({
  x,
  y,
  payload,
  onClientClick
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
  onClientClick: (clientName: string) => void;
}) {
  const clientName = payload?.value ?? '';

  return (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      fill="#696968"
      fontSize={12}
      className="cursor-pointer hover:fill-base-black"
      onClick={() => onClientClick(clientName)}
    >
      {clientName}
    </text>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-[400px] rounded-md border border-sand-300 bg-sand-100 p-4">
      <div className="flex h-full items-end gap-3">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="flex flex-1 flex-col justify-end gap-2">
            <div className="h-4 animate-pulse rounded bg-sand-300/60" style={{ width: `${45 + (index % 4) * 12}%` }} />
            <div className="h-4 animate-pulse rounded bg-sand-300/60" style={{ width: `${65 + (index % 3) * 8}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TopClientsByCategoryChart() {
  const [selectedMonth, setSelectedMonth] = useState(defaultMonthValue);
  const [topN, setTopN] = useState(10);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<SelectedClient | null>(null);
  const topClients = useTopClientsByCategory(selectedMonth);

  const monthOptions = useMemo(() => getMonthOptions(defaultMonthValue()), []);
  const { chartData, categories, categoryColours } = useMemo(
    () => shapeChartData(topClients.data ?? [], topN),
    [topClients.data, topN]
  );
  const selectedMonthLabel = formatMonth(selectedMonth);
  const lastCategoryKey = categories[categories.length - 1];

  const openClientDetail = (row: TopClientsChartRow) => {
    setSelectedClient({
      family_id: row.family_id,
      client_name: row.client_name,
      total_minutes: row.total_minutes,
      tasks_closed_team_initiated: row.tasks_closed_team_initiated
    });
  };

  const openClientDetailByName = (clientName: string) => {
    const row = chartData.find((entry) => entry.client_name === clientName);
    if (row) openClientDetail(row);
  };

  const openClientDetailFromEvent = (data: unknown) => {
    const row = getChartRowFromEvent(data);
    if (row) openClientDetail(row);
  };

  return (
    <section className="rounded-lg border border-sand-300 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-base-black">Top Clients by Time Logged</h2>
          <p className="mt-1 text-sm text-grey-400">Time logged per client, broken down by service category.</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <label className="sr-only" htmlFor="analytics-month-select">
            Select month
          </label>
          <select
            id="analytics-month-select"
            className={`${selectBase} min-w-44`}
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="analytics-top-n-select">
            Select top client count
          </label>
          <select
            id="analytics-top-n-select"
            className={`${selectBase} min-w-28`}
            value={topN}
            onChange={(event) => setTopN(Number(event.target.value))}
          >
            {[5, 10, 15].map((value) => (
              <option key={value} value={value}>
                Top {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5">
        {topClients.error ? (
          <ErrorState message="Failed to load analytics data." onRetry={() => topClients.refetch()} />
        ) : topClients.isLoading ? (
          <ChartSkeleton />
        ) : chartData.length === 0 ? (
          <div className="flex min-h-[400px] items-center justify-center rounded-md border border-dashed border-sand-300 bg-sand-100 text-sm text-grey-400">
            No time logged in {selectedMonthLabel}
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(400, topN * 50)}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 130, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E5E0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#696968', fontSize: 12 }}
                  tickFormatter={(value) => `${(Number(value) / 60).toFixed(1)}h`}
                  label={{ value: 'Hours', position: 'insideBottom', offset: -18, fill: '#696968', fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="client_name"
                  width={220}
                  tick={<ClientYAxisTick onClientClick={openClientDetailByName} />}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(39, 67, 70, 0.06)' }}
                  content={
                    <CustomTooltip
                      categories={categories}
                      categoryColours={categoryColours}
                      hoveredCategory={hoveredCategory}
                    />
                  }
                />
                {categories.map((category) => (
                  <Bar
                    key={category}
                    dataKey={category}
                    stackId="a"
                    fill={categoryColours[category]}
                    className="cursor-pointer"
                    onClick={openClientDetailFromEvent}
                    onMouseEnter={() => setHoveredCategory(category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    {category === lastCategoryKey && (
                      <LabelList
                        dataKey="bar_label"
                        position="right"
                        content={(props) => {
                          const { x, y, width, height, value } = props;
                          if (!value) return null;
                          return (
                            <text
                              x={Number(x) + Number(width) + 6}
                              y={Number(y) + Number(height) / 2}
                              dy={4}
                              fill="#57534e"
                              fontSize={13}
                              textAnchor="start"
                            >
                              {value}
                            </text>
                          );
                        }}
                      />
                    )}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-grey-400">
              {categories.map((category) => (
                <div key={category} className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: categoryColours[category] }} />
                  <span>{category}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {selectedClient && (
        <ClientMonthDetailModal
          familyId={selectedClient.family_id}
          clientName={selectedClient.client_name}
          month={selectedMonth}
          monthLabel={selectedMonthLabel}
          fallbackTotalMinutes={selectedClient.total_minutes}
          tasksClosedTeamInitiated={selectedClient.tasks_closed_team_initiated}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </section>
  );
}
