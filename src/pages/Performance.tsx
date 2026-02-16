import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FilterBar } from '../components/layout/FilterBar';
import { DataTable } from '../components/ui/DataTable';
import { ErrorState } from '../components/ui/ErrorState';
import { SkeletonTable } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useClientHealth } from '../hooks/useClientHealth';
import { useFOHPerformance } from '../hooks/useFOHPerformance';
import { useTogglDetail } from '../hooks/useTogglDetail';
import { UseFiltersResult } from '../hooks/useFilters';
import { formatDuration } from '../lib/format';

export function Performance() {
  const filtersApi = useOutletContext<UseFiltersResult>();
  const [expandedAssistantId, setExpandedAssistantId] = useState<string | null>(null);
  const detailFilters = {
    ...filtersApi.filters,
    assistant: expandedAssistantId ? [expandedAssistantId] : []
  };

  const performance = useFOHPerformance(filtersApi.filters);
  const clients = useClientHealth(detailFilters, { enabled: Boolean(expandedAssistantId) });
  const toggl = useTogglDetail(detailFilters, { enabled: Boolean(expandedAssistantId) });

  const isLoading = performance.isLoading;
  const hasError = performance.error;

  const clientByAssistant = (clients.data ?? []).reduce<Record<string, string[]>>((acc, row) => {
    const label = `${row.family_name} (${row.health_status})`;
    acc[row.assistant_id] = [...(acc[row.assistant_id] ?? []), label];
    return acc;
  }, {});

  const minsByAssistant = (toggl.data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.assistant_id] = (acc[row.assistant_id] ?? 0) + row.minutes;
    return acc;
  }, {});

  const rows = performance.data ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border-l-4 border-l-assistant-dark border border-sand-300 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-base-black">Assistant Performance</h1>
        <p className="mt-1 text-sm text-grey-400">FOH metrics with drill-down by assistant.</p>
      </section>
      <FilterBar
        filtersApi={filtersApi}
        visibleFilters={['period', 'assistant', 'status']}
      />

      {hasError && (
        <ErrorState
          message="Failed to load performance data."
          onRetry={() => {
            performance.refetch();
            if (expandedAssistantId) {
              clients.refetch();
              toggl.refetch();
            }
          }}
        />
      )}

      {isLoading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : !hasError && (
        <section>
          <h2 className="mb-2 text-lg font-bold text-base-black">FOH Performance</h2>
          <DataTable
            data={rows}
            rowKey={(row) => row.assistant_id}
            caption="FOH assistant performance"
            emptyMessage="No performance data for the selected filters."
            onRowClick={(row) => setExpandedAssistantId((prev) => (prev === row.assistant_id ? null : row.assistant_id))}
            expandedRowKey={expandedAssistantId}
            renderExpanded={(row) => (
              <div className="space-y-2 p-2">
                <div className="text-sm text-base-black">
                  <span className="font-semibold">Clients:</span>{' '}
                  {expandedAssistantId === row.assistant_id && clients.isLoading
                    ? 'Loading...'
                    : (clientByAssistant[row.assistant_id] ?? []).join(', ') || 'No clients'}
                </div>
                <div className="text-sm text-base-black">
                  <span className="font-semibold">Total time in period:</span>{' '}
                  {expandedAssistantId === row.assistant_id && toggl.isLoading
                    ? 'Loading...'
                    : formatDuration(minsByAssistant[row.assistant_id] ?? 0)}
                </div>
              </div>
            )}
            columns={[
              { key: 'assistant', header: 'Assistant', render: (row) => row.assistant_name, sortable: true, value: (row) => row.assistant_name },
              { key: 'completed', header: 'Tasks Completed', render: (row) => row.tasks_completed, sortable: true, value: (row) => row.tasks_completed },
              { key: 'active', header: 'Active Tasks', render: (row) => row.active_tasks, sortable: true, value: (row) => row.active_tasks },
              {
                key: 'avg',
                header: 'Avg Mins/Task',
                render: (row) => formatDuration(Number(row.avg_mins_per_task)),
                sortable: true,
                value: (row) => Number(row.avg_mins_per_task)
              },
              {
                key: 'clients',
                header: 'Clients (R/A/G)',
                render: (row) => `${row.red_clients}/${row.amber_clients}/${Math.max(0, row.client_count - row.red_clients - row.amber_clients)}`
              },
              { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.performance_status} /> }
            ]}
          />
        </section>
      )}
    </div>
  );
}
