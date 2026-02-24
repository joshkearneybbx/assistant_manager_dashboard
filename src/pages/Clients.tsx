import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FilterBar } from '../components/layout/FilterBar';
import { CategoryBreakdown } from '../components/charts/CategoryBreakdown';
import { DataTable } from '../components/ui/DataTable';
import { ErrorState } from '../components/ui/ErrorState';
import { SkeletonStatCards, SkeletonTable } from '../components/ui/Skeleton';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useClientHealth } from '../hooks/useClientHealth';
import { useClientTimeBreakdown } from '../hooks/useClientTimeBreakdown';
import { useClientTimeTotals } from '../hooks/useClientTimeTotals';
import { useRecentClientTasks } from '../hooks/useRecentClientTasks';
import { useTasksDetail } from '../hooks/useTasksDetail';
import { UseFiltersResult } from '../hooks/useFilters';
import { daysAgo, formatDuration } from '../lib/format';

function toSubcategoryLabel(value: string | null): string {
  if (!value) return 'Uncategorized';
  const withoutEmojiPrefix = value.replace(/^[^A-Za-z0-9]+/, '').trim();
  const parts = withoutEmojiPrefix.split(/\s-\s/);
  return (parts[parts.length - 1] ?? withoutEmojiPrefix).trim() || 'Uncategorized';
}

function parseCategoryBadge(value: string | null): { emoji: string; label: string } {
  if (!value) return { emoji: '🏷️', label: 'Uncategorized' };
  const emojiMatch = value.match(/^[^A-Za-z0-9]+/);
  const emoji = emojiMatch?.[0]?.trim() || '🏷️';
  return {
    emoji,
    label: toSubcategoryLabel(value)
  };
}

function flexUsageClass(used: number): string {
  if (used >= 18) return 'border-status-red bg-status-red-light text-status-red';
  if (used >= 15) return 'border-status-orange bg-status-orange-light text-status-orange-text';
  return 'border-status-green bg-status-green-light text-status-green';
}

const recentTaskDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC'
});

function toTaskDateLabel(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return recentTaskDateFormatter.format(parsed);
}

export function Clients() {
  const filtersApi = useOutletContext<UseFiltersResult>();
  const [expandedFamilyId, setExpandedFamilyId] = useState<string | null>(null);

  const clients = useClientHealth(filtersApi.filters);
  const tasks = useTasksDetail(filtersApi.filters);
  const timeTotals = useClientTimeTotals(filtersApi.filters);
  const breakdown = useClientTimeBreakdown(filtersApi.filters, expandedFamilyId ?? undefined);
  const recentTasks = useRecentClientTasks(expandedFamilyId ?? undefined);

  const isLoading = clients.isLoading || tasks.isLoading || timeTotals.isLoading;
  const hasError = clients.error || tasks.error || timeTotals.error;

  const rows = clients.data ?? [];
  const completedByClient = (tasks.data ?? []).reduce<Record<string, number>>((acc, task) => {
    if (task.closed_date) {
      acc[task.family_id] = (acc[task.family_id] ?? 0) + 1;
    }
    return acc;
  }, {});

  const minsByClient = (timeTotals.data ?? []).reduce<Record<string, number>>((acc, entry) => {
    acc[entry.family_id] = (acc[entry.family_id] ?? 0) + entry.total_minutes;
    return acc;
  }, {});

  const redCount = rows.filter((row) => row.health_status === 'Red').length;
  const amberCount = rows.filter((row) => row.health_status === 'Amber').length;
  const renewCount = rows.filter((row) => row.health_status === 'Purple').length;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border-l-4 border-l-assistant-dark border border-sand-300 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-base-black">Client Health</h1>
        <p className="mt-1 text-sm text-grey-400">Client activity status with expandable time and task breakdown.</p>
      </section>
      <FilterBar
        filtersApi={filtersApi}
        planFilter="subscription_type"
        clientFilterMode="search"
        visibleFilters={['period', 'assistant', 'client', 'plan', 'status']}
      />

      {hasError && (
        <ErrorState
          message="Failed to load client data."
          onRetry={() => {
            clients.refetch();
            tasks.refetch();
            timeTotals.refetch();
          }}
        />
      )}

      {isLoading ? (
        <>
          <SkeletonStatCards count={4} />
          <SkeletonTable rows={8} cols={8} />
        </>
      ) : !hasError && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard label="Total Clients" value={rows.length} />
            <StatCard label="Red Clients" value={redCount} />
            <StatCard label="Amber Clients" value={amberCount} />
            <StatCard label="Renew Clients" value={renewCount} />
          </div>

          <section>
            <h2 className="mb-2 text-lg font-bold text-base-black">Client Overview</h2>
            <DataTable
              data={rows}
              rowKey={(row) => row.family_id}
              caption="Client health overview"
              emptyMessage="No clients match the selected filters."
              onRowClick={(row) => setExpandedFamilyId((prev) => (prev === row.family_id ? null : row.family_id))}
              expandedRowKey={expandedFamilyId}
              renderExpanded={(row) => {
                const clientTasks = (tasks.data ?? []).filter((task) => task.family_id === row.family_id);
                const timeBySubcategory = (breakdown.data ?? []).reduce<Record<string, number>>((acc, entry) => {
                  const key = toSubcategoryLabel(entry.category);
                  acc[key] = (acc[key] ?? 0) + entry.minutes;
                  return acc;
                }, {});

                const chartData = Object.entries(timeBySubcategory)
                  .map(([category, minutes]) => ({ family_id: row.family_id, category, minutes }))
                  .sort((a, b) => b.minutes - a.minutes);

                const tasksByCategory = Object.entries(
                  clientTasks.reduce<Record<string, number>>((acc, task) => {
                    const key = toSubcategoryLabel(task.category);
                    acc[key] = (acc[key] ?? 0) + 1;
                    return acc;
                  }, {})
                )
                  .map(([category, count]) => ({ category, count }))
                  .sort((a, b) => b.count - a.count);

                const clientRecentTasks =
                  expandedFamilyId === row.family_id ? (recentTasks.data ?? []) : [];

                return (
                  <div className="max-h-[70vh] space-y-4 overflow-y-auto p-2">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div>
                        <h3 className="mb-2 text-sm font-semibold text-base-black">Time by Category</h3>
                        {breakdown.isLoading ? (
                          <div className="text-sm text-grey-400">Loading breakdown...</div>
                        ) : (
                          <CategoryBreakdown data={chartData} height={120} xAxisAngle={-45} />
                        )}
                      </div>
                      <div>
                        <h3 className="mb-2 text-sm font-semibold text-base-black">Tasks by Category</h3>
                        <div className="overflow-hidden rounded-md border border-sand-300 bg-white">
                          <div className="grid grid-cols-[1fr_auto] border-b border-sand-300 bg-sand-100 px-3 py-2 text-xs font-semibold text-grey-400">
                            <span>Category</span>
                            <span>Tasks</span>
                          </div>
                          {tasksByCategory.length ? (
                            <ul className="divide-y divide-sand-300">
                              {tasksByCategory.map((entry) => (
                                <li key={entry.category} className="grid grid-cols-[1fr_auto] px-3 py-2 text-sm text-base-black">
                                  <span className="pr-2">{entry.category}</span>
                                  <span className="tabular-nums">{entry.count}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="px-3 py-3 text-sm text-grey-400">No tasks in selected period.</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-base-black">Recent Tasks</h3>
                      <div className="space-y-2">
                        {expandedFamilyId === row.family_id && recentTasks.isLoading ? (
                          <div className="rounded-md border border-sand-300 bg-sand-100 px-3 py-3 text-sm text-grey-400">
                            Loading recent tasks...
                          </div>
                        ) : expandedFamilyId === row.family_id && recentTasks.error ? (
                          <div className="rounded-md border border-sand-300 bg-sand-100 px-3 py-3 text-sm text-status-red">
                            Failed to load recent tasks.
                          </div>
                        ) : clientRecentTasks.length ? (
                          clientRecentTasks.map((task, index) => {
                            const category = parseCategoryBadge(task.category);
                            const isClosed = Boolean(task.closed_at);
                            const status = isClosed ? 'Closed' : 'Open';
                            const dateLabel = isClosed
                              ? toTaskDateLabel(task.closed_at as string)
                              : toTaskDateLabel(task.created_at);

                            return (
                              <article
                                key={`${task.title}-${task.created_at}-${index}`}
                                className="rounded-md border border-sand-300 bg-white px-3 py-2"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="text-sm font-semibold text-base-black">{task.title}</div>
                                  <div className="inline-flex items-center gap-2 text-xs">
                                    <span
                                      className={`inline-flex rounded-full border px-2 py-0.5 font-semibold ${
                                        isClosed
                                          ? 'border-sand-300 bg-sand-100 text-grey-400'
                                          : 'border-status-green bg-status-green-light text-status-green'
                                      }`}
                                    >
                                      {status}
                                    </span>
                                    <span className="text-grey-400">{dateLabel}</span>
                                  </div>
                                </div>
                                <div className="mt-1">
                                  <span className="inline-flex items-center gap-1 rounded-full border border-sand-300 bg-sand-100 px-2 py-0.5 text-xs font-medium text-base-black">
                                    <span>{category.emoji}</span>
                                    <span>{category.label}</span>
                                  </span>
                                </div>
                              </article>
                            );
                          })
                        ) : (
                          <div className="rounded-md border border-sand-300 bg-sand-100 px-3 py-3 text-sm text-grey-400">
                            No recent tasks found.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }}
              columns={[
                {
                  key: 'client',
                  header: 'Client',
                  render: (row) => (
                    <div className="flex items-center gap-2">
                      <span>{row.family_name}</span>
                      {row.life_transitions ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-sand-300 bg-sand-100 px-2 py-0.5 text-xs text-base-black">
                          {row.life_transition_icons ? <span>{row.life_transition_icons}</span> : null}
                          <span>{row.life_transitions}</span>
                        </span>
                      ) : null}
                    </div>
                  ),
                  sortable: true,
                  value: (row) => row.family_name
                },
                { key: 'assistant', header: 'Assistant', render: (row) => row.assistant_name, sortable: true, value: (row) => row.assistant_name },
                {
                  key: 'plan',
                  header: 'Plan',
                  render: (row) => {
                    const planName = row.subscription_type ?? row.contract ?? '-';
                    const isFlexClient = row.subscription_type === 'Flex' || row.contract === 'BlckBx Flex';

                    if (!isFlexClient) return planName;

                    const usage = row.flex_tasks_used ?? 0;
                    const badgeClass = flexUsageClass(usage);

                    return (
                      <div className="inline-flex items-center gap-2">
                        <span>{planName}</span>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
                          {usage}/20
                        </span>
                      </div>
                    );
                  }
                },
                {
                  key: 'active',
                  header: 'Active Tasks',
                  render: (row) => {
                    const isFlexClient = row.subscription_type === 'Flex' || row.contract === 'BlckBx Flex';
                    return isFlexClient ? `${row.flex_tasks_used ?? 0} / 20` : row.active_tasks;
                  },
                  sortable: true,
                  value: (row) => {
                    const isFlexClient = row.subscription_type === 'Flex' || row.contract === 'BlckBx Flex';
                    return isFlexClient ? row.flex_tasks_used ?? 0 : row.active_tasks;
                  }
                },
                {
                  key: 'completed',
                  header: 'Completed (period)',
                  render: (row) => {
                    const isFlexClient = row.subscription_type === 'Flex' || row.contract === 'BlckBx Flex';
                    return isFlexClient ? `${row.flex_tasks_used ?? 0} / 20` : completedByClient[row.family_id] ?? 0;
                  },
                  sortable: true,
                  value: (row) => {
                    const isFlexClient = row.subscription_type === 'Flex' || row.contract === 'BlckBx Flex';
                    return isFlexClient ? row.flex_tasks_used ?? 0 : completedByClient[row.family_id] ?? 0;
                  }
                },
                { key: 'last', header: 'Last Task', render: (row) => daysAgo(row.days_since_last_task), sortable: true, value: (row) => row.days_since_last_task },
                { key: 'time', header: 'Total Time (period)', render: (row) => formatDuration(minsByClient[row.family_id] ?? 0), sortable: true, value: (row) => minsByClient[row.family_id] ?? 0 },
                { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.health_status} /> }
              ]}
            />
          </section>
        </>
      )}
    </div>
  );
}
