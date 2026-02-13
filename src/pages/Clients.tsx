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
import { useTasksDetail } from '../hooks/useTasksDetail';
import { UseFiltersResult } from '../hooks/useFilters';
import { daysAgo, formatDuration } from '../lib/format';

export function Clients() {
  const filtersApi = useOutletContext<UseFiltersResult>();
  const [expandedFamilyId, setExpandedFamilyId] = useState<string | null>(null);

  const clients = useClientHealth(filtersApi.filters);
  const tasks = useTasksDetail(filtersApi.filters);
  const timeTotals = useClientTimeTotals(filtersApi.filters);
  const breakdown = useClientTimeBreakdown(filtersApi.filters, expandedFamilyId ?? undefined);

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
          <SkeletonStatCards count={3} />
          <SkeletonTable rows={8} cols={8} />
        </>
      ) : !hasError && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard label="Total Clients" value={rows.length} />
            <StatCard label="Red Clients" value={redCount} />
            <StatCard label="Amber Clients" value={amberCount} />
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
                const recentTasks = (tasks.data ?? []).filter((task) => task.family_id === row.family_id).slice(0, 5);
                return (
                  <div className="space-y-4 p-2">
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-base-black">Time by Category</h3>
                      {breakdown.isLoading ? (
                        <div className="text-sm text-grey-400">Loading breakdown...</div>
                      ) : (
                        <CategoryBreakdown data={breakdown.data ?? []} />
                      )}
                    </div>
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-base-black">Recent Tasks</h3>
                      <ul className="space-y-1 text-sm text-base-black">
                        {recentTasks.length ? recentTasks.map((task) => <li key={task.task_id}>{task.task_title}</li>) : <li className="text-grey-400">No recent tasks.</li>}
                      </ul>
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
                { key: 'plan', header: 'Plan', render: (row) => row.subscription_type ?? row.contract ?? '-' },
                { key: 'active', header: 'Active Tasks', render: (row) => row.active_tasks, sortable: true, value: (row) => row.active_tasks },
                { key: 'completed', header: 'Completed (period)', render: (row) => completedByClient[row.family_id] ?? 0, sortable: true, value: (row) => completedByClient[row.family_id] ?? 0 },
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
