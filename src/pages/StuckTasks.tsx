import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FilterBar } from '../components/layout/FilterBar';
import { DataTable } from '../components/ui/DataTable';
import { ErrorState } from '../components/ui/ErrorState';
import { SkeletonTable } from '../components/ui/Skeleton';
import { useStuckTasks } from '../hooks/useStuckTasks';
import { UseFiltersResult } from '../hooks/useFilters';

const taskStatusOptions = [
  'New Task',
  'To Do',
  'In Progress',
  'Info Needed',
  'Info Needed from Supplier',
  '3.5. Feedback/Payment',
  'On Hold'
];

const selectBase =
  'h-10 appearance-none rounded-md border border-sand-300 bg-white bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2716%27%20height%3D%2716%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27%23696968%27%20stroke-width%3D%272%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpath%20d%3D%27m6%209%206%206%206-6%27/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_8px_center] bg-no-repeat pl-3 pr-8 text-sm text-base-black focus:border-assistant-dark focus:outline-none focus:ring-2 focus:ring-assistant-dark/20';

export function StuckTasks() {
  const filtersApi = useOutletContext<UseFiltersResult>();
  const { filters } = filtersApi;
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('all');
  const tasks = useStuckTasks(filters, taskStatusFilter);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border-l-4 border-l-assistant-dark border border-sand-300 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-base-black">Stuck Tasks</h1>
        <p className="mt-1 text-sm text-grey-400">Tasks open too long that need immediate attention.</p>
      </section>
      <FilterBar filtersApi={filtersApi} visibleFilters={['assistant', 'client']} />

      {tasks.error && (
        <ErrorState message="Failed to load stuck tasks." onRetry={() => tasks.refetch()} />
      )}

      <section>
        <h2 className="mb-2 text-lg font-bold text-base-black">Open Tasks</h2>
        <div className="mb-3 flex items-center gap-2">
          <label className="text-sm text-grey-400">Task Status:</label>
          <select
            className={`${selectBase} min-w-56`}
            value={taskStatusFilter}
            onChange={(event) => setTaskStatusFilter(event.target.value)}
            aria-label="Filter by task status"
          >
            <option value="all">All Statuses</option>
            {taskStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {tasks.isLoading ? (
          <SkeletonTable rows={8} cols={7} />
        ) : !tasks.error && (
          <DataTable
            data={tasks.data ?? []}
            rowKey={(row) => row.task_id}
            caption="Stuck tasks"
            emptyMessage="No stuck tasks match the selected filters."
            columns={[
              { key: 'task', header: 'Task Title', render: (row) => row.task_title, sortable: true, value: (row) => row.task_title },
              { key: 'client', header: 'Client', render: (row) => row.family_name, sortable: true, value: (row) => row.family_name },
              { key: 'assistant', header: 'Assistant', render: (row) => row.assistant_name, sortable: true, value: (row) => row.assistant_name },
              { key: 'days', header: 'Days Since Update', render: (row) => row.days_since_update, sortable: true, value: (row) => row.days_since_update },
              { key: 'taskStatus', header: 'Task Status', render: (row) => row.task_status, sortable: true, value: (row) => row.task_status },
              { key: 'state', header: 'State', render: (row) => row.task_state },
              { key: 'category', header: 'Category', render: (row) => row.category ?? '-' }
            ]}
          />
        )}
      </section>
    </div>
  );
}
