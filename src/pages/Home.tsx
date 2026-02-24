import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { FilterBar } from '../components/layout/FilterBar';
import { AlertCard } from '../components/ui/AlertCard';
import { DataTable } from '../components/ui/DataTable';
import { ErrorState } from '../components/ui/ErrorState';
import { SkeletonAlertCards, SkeletonTable } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useClientHealth } from '../hooks/useClientHealth';
import { useDashboardAlerts } from '../hooks/useDashboardAlerts';
import { useFOHPerformance } from '../hooks/useFOHPerformance';
import { useStuckTasks } from '../hooks/useStuckTasks';
import { UseFiltersResult } from '../hooks/useFilters';
import { formatDuration } from '../lib/format';

type AlertLikeRow = {
  alert_type?: string | null;
  red_count?: number | null;
  amber_count?: number | null;
};

function normalizeAlertType(value: string | null | undefined): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function buildAlertMap(data: AlertLikeRow[]) {
  const map = new Map<string, { red: number; amber: number }>();
  for (const row of data) {
    map.set(normalizeAlertType(row.alert_type), {
      red: Number(row.red_count ?? 0),
      amber: Number(row.amber_count ?? 0)
    });
  }
  return map;
}

function getAlertCounts(
  alertMap: Map<string, { red: number; amber: number }>,
  aliases: string[]
) {
  for (const alias of aliases) {
    const match = alertMap.get(normalizeAlertType(alias));
    if (match) return match;
  }
  return { red: 0, amber: 0 };
}

export function Home() {
  const filtersApi = useOutletContext<UseFiltersResult>();
  const navigate = useNavigate();

  const alerts = useDashboardAlerts();
  const clients = useClientHealth(filtersApi.filters);
  const performance = useFOHPerformance(filtersApi.filters);
  const stuckTasks = useStuckTasks(filtersApi.filters);

  const isLoading = alerts.isLoading || clients.isLoading || performance.isLoading || stuckTasks.isLoading;
  const hasError = alerts.error || clients.error || performance.error || stuckTasks.error;

  const alertData = alerts.data ?? [];
  const alertMap = buildAlertMap(alertData);
  const capCounts = getAlertCounts(alertMap, ['capacity', 'foh_capacity', 'foh capacity']);

  const clientRows = clients.data ?? [];
  const performanceRows = performance.data ?? [];
  const stuckRows = stuckTasks.data ?? [];

  const clientCounts = {
    red: clientRows.filter((row) => row.health_status === 'Red').length,
    amber: clientRows.filter((row) => row.health_status === 'Amber' || row.health_status === 'Purple').length
  };

  const perfCounts = {
    red: performanceRows.filter((row) => row.performance_status === 'Red').length,
    amber: performanceRows.filter((row) => row.performance_status === 'Amber').length
  };

  const stuckCounts = {
    red: stuckRows.filter((row) => row.stuck_status === 'Stuck').length,
    amber: stuckRows.filter((row) => row.stuck_status === 'Aging' || row.stuck_status === 'Delayed').length
  };

  const attentionClients = clientRows.filter((c) => c.health_status !== 'Green').slice(0, 5);
  const flaggedAssistants = performanceRows
    .filter((a) => a.performance_status !== 'Green')
    .slice(0, 5);
  const stuckList = stuckRows.slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border-l-4 border-l-assistant-dark border border-sand-300 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-base-black">Alerts Dashboard</h1>
        <p className="mt-1 text-sm text-grey-400">Operational view of client health, assistant performance, and stuck work.</p>
      </section>
      <FilterBar
        filtersApi={filtersApi}
        clientFilterMode="search"
        visibleFilters={['period', 'assistant', 'client', 'plan', 'status']}
      />

      {hasError && (
        <ErrorState
          message="Failed to load dashboard data."
          onRetry={() => {
            alerts.refetch();
            clients.refetch();
            performance.refetch();
            stuckTasks.refetch();
          }}
        />
      )}

      {isLoading ? (
        <>
          <SkeletonAlertCards />
          <SkeletonTable rows={5} cols={4} />
        </>
      ) : !hasError && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AlertCard title="Client Health" redCount={clientCounts.red} amberCount={clientCounts.amber} onClick={() => navigate('/clients?status=Red,Amber,Purple')} />
            <AlertCard title="Assistant Performance" redCount={perfCounts.red} amberCount={perfCounts.amber} onClick={() => navigate('/performance?status=Red,Amber')} />
            <AlertCard title="Stuck Tasks" redCount={stuckCounts.red} amberCount={stuckCounts.amber} onClick={() => navigate('/stuck-tasks')} />
            <AlertCard title="Capacity" redCount={capCounts.red} amberCount={capCounts.amber} onClick={() => navigate('/capacity')} />
          </div>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-bold text-base-black">Clients Needing Attention</h2>
              <Link className="text-sm text-assistant-dark hover:underline" to="/clients?status=Red,Amber,Purple">
                View All
              </Link>
            </div>
            <DataTable
              data={attentionClients}
              rowKey={(row) => row.family_id}
              caption="Clients needing attention"
              emptyMessage="No clients need attention right now."
              columns={[
                { key: 'name', header: 'Client', render: (row) => row.family_name, sortable: true, value: (row) => row.family_name },
                { key: 'assistant', header: 'Assistant', render: (row) => row.assistant_name, sortable: true, value: (row) => row.assistant_name },
                { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.health_status} /> },
                { key: 'days', header: 'Days Inactive', render: (row) => `${row.days_since_last_task} days`, sortable: true, value: (row) => row.days_since_last_task }
              ]}
              onRowClick={() => navigate('/clients')}
            />
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-bold text-base-black">Assistants Flagged</h2>
              <Link className="text-sm text-assistant-dark hover:underline" to="/performance?status=Red,Amber">
                View All
              </Link>
            </div>
            <DataTable
              data={flaggedAssistants}
              rowKey={(row) => row.assistant_id}
              caption="Flagged assistants"
              emptyMessage="No assistants are currently flagged."
              columns={[
                { key: 'assistant', header: 'Assistant', render: (row) => row.assistant_name, sortable: true, value: (row) => row.assistant_name },
                { key: 'mins', header: 'Avg Mins/Task', render: (row) => formatDuration(row.avg_mins_per_task), sortable: true, value: (row) => row.avg_mins_per_task },
                { key: 'red', header: 'Red Clients', render: (row) => row.red_clients, sortable: true, value: (row) => row.red_clients },
                { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.performance_status} /> }
              ]}
              onRowClick={() => navigate('/performance')}
            />
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-bold text-base-black">Stuck Tasks (7+ days)</h2>
              <Link className="text-sm text-assistant-dark hover:underline" to="/stuck-tasks">
                View All
              </Link>
            </div>
            <DataTable
              data={stuckList}
              rowKey={(row) => row.task_id}
              caption="Stuck tasks older than 7 days"
              emptyMessage="No stuck tasks right now."
              columns={[
                { key: 'title', header: 'Task', render: (row) => row.task_title, sortable: true, value: (row) => row.task_title },
                { key: 'client', header: 'Client', render: (row) => row.family_name },
                { key: 'assistant', header: 'Assistant', render: (row) => row.assistant_name },
                { key: 'days', header: 'Days Open', render: (row) => row.days_since_update, sortable: true, value: (row) => row.days_since_update }
              ]}
              onRowClick={() => navigate('/stuck-tasks')}
            />
          </section>
        </>
      )}
    </div>
  );
}
