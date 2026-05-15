import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FlexTaskPill, FlexTravelTaskPill, isFlexClient } from '../ui/FlexUsagePills';
import { useClientHealth } from '../../hooks/useClientHealth';
import { useClientMonthDetail, type ClientMonthDetailRow } from '../../hooks/useClientMonthDetail';
import { formatDuration } from '../../lib/format';

interface ClientMonthDetailModalProps {
  familyId: string;
  clientName: string;
  month: string;
  monthLabel: string;
  fallbackTotalMinutes?: number;
  tasksClosedTeamInitiated?: number;
  onClose: () => void;
}

interface CategoryGroup {
  category: string;
  tasks: number;
  total_minutes: number;
  foh_minutes: number;
  boh_minutes: number;
  subcategories: Array<{
    subcategory: string;
    tasks: number;
    total_minutes: number;
    foh_minutes: number;
    boh_minutes: number;
  }>;
}

type SortOption = 'time_desc' | 'time_asc' | 'closed_desc' | 'title_az';
type Tab = 'category' | 'tasks';

const teamInitiatedSources = new Set(['initiative', 'engagement', 'marketing']);

const selectBase =
  'h-10 appearance-none rounded-md border border-sand-300 bg-white bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2716%27%20height%3D%2716%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27%23696968%27%20stroke-width%3D%272%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpath%20d%3D%27m6%209%206%206%206-6%27/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_8px_center] bg-no-repeat pl-3 pr-8 text-sm text-base-black focus:border-assistant-dark focus:outline-none focus:ring-2 focus:ring-assistant-dark/20';

const closedDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC'
});

function timeOrDash(minutes: number): string {
  return minutes > 0 ? formatDuration(minutes) : '—';
}

function formatClosedDate(value: string): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return closedDateFormatter.format(parsed);
}

function isTeamInitiatedSource(source: string): boolean {
  return teamInitiatedSources.has(source.trim().toLowerCase());
}

function groupByCategory(rows: ClientMonthDetailRow[]): CategoryGroup[] {
  const groups = new Map<
    string,
    {
      category: string;
      tasks: number;
      total_minutes: number;
      foh_minutes: number;
      boh_minutes: number;
      subcategoryMap: Map<string, CategoryGroup['subcategories'][number]>;
    }
  >();

  rows.forEach((row) => {
    const category = row.parent_category || 'Uncategorized';
    const subcategory = row.subcategory || 'Uncategorized';
    const group = groups.get(category) ?? {
      category,
      tasks: 0,
      total_minutes: 0,
      foh_minutes: 0,
      boh_minutes: 0,
      subcategoryMap: new Map()
    };
    const subGroup = group.subcategoryMap.get(subcategory) ?? {
      subcategory,
      tasks: 0,
      total_minutes: 0,
      foh_minutes: 0,
      boh_minutes: 0
    };

    group.tasks += 1;
    group.total_minutes += row.total_minutes;
    group.foh_minutes += row.foh_minutes;
    group.boh_minutes += row.boh_minutes;
    subGroup.tasks += 1;
    subGroup.total_minutes += row.total_minutes;
    subGroup.foh_minutes += row.foh_minutes;
    subGroup.boh_minutes += row.boh_minutes;

    group.subcategoryMap.set(subcategory, subGroup);
    groups.set(category, group);
  });

  return Array.from(groups.values())
    .map((group) => ({
      category: group.category,
      tasks: group.tasks,
      total_minutes: group.total_minutes,
      foh_minutes: group.foh_minutes,
      boh_minutes: group.boh_minutes,
      subcategories: Array.from(group.subcategoryMap.values()).sort(
        (a, b) => b.total_minutes - a.total_minutes || a.subcategory.localeCompare(b.subcategory)
      )
    }))
    .sort((a, b) => b.total_minutes - a.total_minutes || a.category.localeCompare(b.category));
}

function KpiTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-sand-300 bg-sand-100 px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-grey-400">{label}</div>
      <div className="mt-1 text-lg font-bold text-base-black">{value}</div>
    </div>
  );
}

function ByCategoryTable({ rows, monthLabel }: { rows: ClientMonthDetailRow[]; monthLabel: string }) {
  const groups = useMemo(() => groupByCategory(rows), [rows]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpanded(new Set(groups.map((group) => group.category)));
  }, [groups]);

  if (!rows.length) {
    return <div className="rounded-lg border border-sand-300 bg-sand-100 p-6 text-center text-sm text-grey-400">No tasks closed in {monthLabel}.</div>;
  }

  return (
    <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-sand-300 bg-white">
      <table className="min-w-full divide-y divide-sand-300 text-sm">
        <thead className="sticky top-0 bg-sand-100 text-left text-xs font-semibold uppercase tracking-wide text-grey-400">
          <tr>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3 text-right">Tasks</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3 text-right">FOH</th>
            <th className="px-4 py-3 text-right">BOH</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sand-300">
          {groups.map((group) => {
            const isExpanded = expanded.has(group.category);
            return (
              <FragmentByCategoryRows
                key={group.category}
                group={group}
                isExpanded={isExpanded}
                onToggle={() => {
                  setExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(group.category)) next.delete(group.category);
                    else next.add(group.category);
                    return next;
                  });
                }}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FragmentByCategoryRows({
  group,
  isExpanded,
  onToggle
}: {
  group: CategoryGroup;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="cursor-pointer bg-white text-base-black hover:bg-sand-100" onClick={onToggle}>
        <td className="px-4 py-3 font-semibold">
          <span className="mr-2 inline-block w-4 text-grey-400">{isExpanded ? '▾' : '▸'}</span>
          {group.category}
        </td>
        <td className="px-4 py-3 text-right tabular-nums">{group.tasks}</td>
        <td className="px-4 py-3 text-right tabular-nums">{timeOrDash(group.total_minutes)}</td>
        <td className="px-4 py-3 text-right tabular-nums">{timeOrDash(group.foh_minutes)}</td>
        <td className="px-4 py-3 text-right tabular-nums">{timeOrDash(group.boh_minutes)}</td>
      </tr>
      {isExpanded &&
        group.subcategories.map((subcategory) => (
          <tr key={subcategory.subcategory} className="bg-sand-100/50 text-sm text-grey-400">
            <td className="px-4 py-2 pl-12">↳ {subcategory.subcategory}</td>
            <td className="px-4 py-2 text-right tabular-nums">{subcategory.tasks}</td>
            <td className="px-4 py-2 text-right tabular-nums">{timeOrDash(subcategory.total_minutes)}</td>
            <td className="px-4 py-2 text-right tabular-nums">{timeOrDash(subcategory.foh_minutes)}</td>
            <td className="px-4 py-2 text-right tabular-nums">{timeOrDash(subcategory.boh_minutes)}</td>
          </tr>
        ))}
    </>
  );
}

function SourcePill({ source }: { source: string }) {
  const label = source || 'Unknown';
  const className = isTeamInitiatedSource(label)
    ? 'border-amber-200 bg-amber-100 text-amber-800'
    : 'border-sand-300 bg-sand-100 text-grey-400';

  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${className}`}>{label}</span>;
}

function TasksTable({ rows, monthLabel }: { rows: ClientMonthDetailRow[]; monthLabel: string }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('time_desc');

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const result = needle
      ? rows.filter((row) => `${row.title} ${row.reference}`.toLowerCase().includes(needle))
      : [...rows];

    return result.sort((a, b) => {
      switch (sort) {
        case 'time_asc':
          return a.total_minutes - b.total_minutes;
        case 'closed_desc':
          return new Date(b.closed_at).getTime() - new Date(a.closed_at).getTime();
        case 'title_az':
          return a.title.localeCompare(b.title);
        case 'time_desc':
        default:
          return b.total_minutes - a.total_minutes;
      }
    });
  }, [rows, search, sort]);

  if (!rows.length) {
    return <div className="rounded-lg border border-sand-300 bg-sand-100 p-6 text-center text-sm text-grey-400">No tasks closed in {monthLabel}.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-grey-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title or reference..."
            className="h-10 w-full rounded-md border border-sand-300 bg-white pl-9 pr-3 text-sm text-base-black placeholder:text-grey-400 focus:border-assistant-dark focus:outline-none focus:ring-2 focus:ring-assistant-dark/20"
          />
        </div>
        <select className={`${selectBase} min-w-44`} value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
          <option value="time_desc">Time desc</option>
          <option value="time_asc">Time asc</option>
          <option value="closed_desc">Closed date desc</option>
          <option value="title_az">Title A-Z</option>
        </select>
      </div>

      <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-sand-300 bg-white">
        <table className="min-w-full divide-y divide-sand-300 text-sm">
          <thead className="sticky top-0 bg-sand-100 text-left text-xs font-semibold uppercase tracking-wide text-grey-400">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Complexity</th>
              <th className="px-4 py-3">FOH</th>
              <th className="px-4 py-3 text-right">Time</th>
              <th className="px-4 py-3">Closed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-300">
            {filteredRows.length ? (
              filteredRows.map((row, index) => (
                <tr key={`${row.reference}-${row.closed_at}-${index}`} className="text-base-black hover:bg-sand-100">
                  <td className="whitespace-nowrap px-4 py-3 font-medium">{row.reference || '—'}</td>
                  <td className="max-w-[280px] px-4 py-3">
                    <div className="truncate" title={row.title}>{row.title || 'Untitled'}</div>
                  </td>
                  <td className="px-4 py-3" title={row.subcategory}>{row.parent_category || 'Uncategorized'}</td>
                  <td className="px-4 py-3"><SourcePill source={row.source_detailed} /></td>
                  <td className="px-4 py-3">
                    {row.complexity ? (
                      <span className="inline-flex rounded-full border border-sand-300 bg-sand-100 px-2 py-0.5 text-xs font-semibold text-grey-400">{row.complexity}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">{row.foh_assistant_name || '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{timeOrDash(row.total_minutes)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatClosedDate(row.closed_at)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-grey-400">No tasks match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ClientMonthDetailModal({
  familyId,
  clientName,
  month,
  monthLabel,
  fallbackTotalMinutes = 0,
  tasksClosedTeamInitiated,
  onClose
}: ClientMonthDetailModalProps) {
  const detail = useClientMonthDetail(familyId, month);
  const clientHealth = useClientHealth({
    period: 'all_time',
    assistant: [],
    client: [familyId],
    contract: [],
    status: []
  });
  const [activeTab, setActiveTab] = useState<Tab>('category');
  const rows = detail.data ?? [];
  const healthRow = clientHealth.data?.[0];
  const derivedTeamInitiatedCount = rows.filter((row) => isTeamInitiatedSource(row.source_detailed)).length;
  const teamInitiatedCount = tasksClosedTeamInitiated ?? derivedTeamInitiatedCount;
  const totalTasks = rows.length;
  const totalMinutes = rows.reduce((sum, row) => sum + row.total_minutes, 0) || fallbackTotalMinutes;
  const fohMinutes = rows.reduce((sum, row) => sum + row.foh_minutes, 0);
  const bohMinutes = rows.reduce((sum, row) => sum + row.boh_minutes, 0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg border border-sand-300 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label={`${clientName} task detail`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 border-b border-sand-300 bg-white p-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-md p-1.5 text-grey-400 transition-colors hover:bg-sand-100 hover:text-base-black"
            aria-label="Close client detail"
          >
            <X size={20} />
          </button>
          <div className="pr-10">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold text-base-black">{clientName}</h2>
              {healthRow && isFlexClient(healthRow) ? (
                <>
                  <FlexTaskPill row={healthRow} />
                  <FlexTravelTaskPill row={healthRow} />
                </>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-grey-400">{monthLabel}</p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiTile label="Total tasks" value={totalTasks} />
            <KpiTile label="Total time" value={formatDuration(totalMinutes)} />
            <KpiTile label="FOH time" value={formatDuration(fohMinutes)} />
            <KpiTile label="BOH time" value={formatDuration(bohMinutes)} />
          </div>
          {teamInitiatedCount > 0 && (
            <p className="mt-3 text-xs text-grey-400">
              Includes {teamInitiatedCount} Initiative/Engagement/Marketing {teamInitiatedCount === 1 ? 'task' : 'tasks'} (excluded from chart label count)
            </p>
          )}
        </header>

        <div className="p-6">
          {detail.isLoading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-sand-300 border-t-assistant-dark" />
            </div>
          ) : detail.error ? (
            <div className="rounded-lg border border-status-red bg-status-red-light p-4 text-sm text-status-red">
              Failed to load client month detail.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-6 border-b border-sand-300">
                <button
                  type="button"
                  onClick={() => setActiveTab('category')}
                  className={`border-b-2 px-1 pb-2 text-sm transition-colors ${
                    activeTab === 'category'
                      ? 'border-base-black font-semibold text-base-black'
                      : 'border-transparent text-grey-400 hover:text-base-black'
                  }`}
                >
                  By Category
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('tasks')}
                  className={`border-b-2 px-1 pb-2 text-sm transition-colors ${
                    activeTab === 'tasks'
                      ? 'border-base-black font-semibold text-base-black'
                      : 'border-transparent text-grey-400 hover:text-base-black'
                  }`}
                >
                  Tasks
                </button>
              </div>

              {activeTab === 'category' ? (
                <ByCategoryTable rows={rows} monthLabel={monthLabel} />
              ) : (
                <TasksTable rows={rows} monthLabel={monthLabel} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
