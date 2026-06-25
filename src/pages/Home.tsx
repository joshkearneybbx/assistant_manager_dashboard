import { useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { FilterBar } from '../components/layout/FilterBar';
import { AlertCard } from '../components/ui/AlertCard';
import { DataTable } from '../components/ui/DataTable';
import { ErrorState } from '../components/ui/ErrorState';
import { FlexTaskPill, FlexTravelTaskPill, isFlexClient } from '../components/ui/FlexUsagePills';
import { SkeletonAlertCards, SkeletonTable } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useClientHealth } from '../hooks/useClientHealth';
import { useDashboardAlerts } from '../hooks/useDashboardAlerts';
import { useFOHPerformance } from '../hooks/useFOHPerformance';
import { useStuckTasks } from '../hooks/useStuckTasks';
import { UseFiltersResult } from '../hooks/useFilters';
import { formatDuration } from '../lib/format';
import type { ClientHealthRow } from '../types';

type AlertLikeRow = {
  alert_type?: string | null;
  red_count?: number | null;
  amber_count?: number | null;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function formatRelativeDay(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.max(0, Math.round((today.getTime() - target.getTime()) / DAY_IN_MS));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

function formatMutedDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatExcludedClosureSummary(count: number, titles: string[]): string | null {
  if (count <= 0) return null;
  const taskLabel = count === 1 ? 'Engagement/Marketing task' : 'Engagement/Marketing tasks';
  const visibleTitles = titles.slice(0, 3);
  const titleList = visibleTitles.join(', ');
  const prefix = `Excluded from this status: ${count} ${taskLabel} closed in the last 7 days`;
  if (!titleList) return prefix;
  if (count > 3 && visibleTitles.length === 3) {
    return `${prefix} — ${titleList}, and ${count - 3} more`;
  }
  return `${prefix} — ${titleList}`;
}

function formatRecurringClosureSummary(count: number, titles: string[]): string | null {
  if (count <= 0) return null;
  const taskLabel = count === 1 ? 'recurring task' : 'recurring tasks';
  const visibleTitles = titles.slice(0, 3);
  const titleList = visibleTitles.join(', ');
  const prefix = `Also closed: ${count} ${taskLabel} in the last 7 days`;
  if (!titleList) return prefix;
  if (count > 3 && visibleTitles.length === 3) {
    return `${prefix} — ${titleList}, and ${count - 3} more`;
  }
  return `${prefix} — ${titleList}`;
}

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

function ReasonLine({
  label,
  date,
  title,
  emptyText,
}: {
  label: string;
  date: string | null;
  title: string | null;
  emptyText: string;
}) {
  const relative = formatRelativeDay(date);
  const actualDate = formatMutedDate(date);

  if (!relative || !actualDate) {
    return <p className="text-xs leading-5 text-grey-400">{emptyText}</p>;
  }

  return (
    <p className="text-xs leading-5 text-grey-400">
      {label}: <span className="font-medium text-base-black">{relative}</span>{' '}
      <span className="text-grey-400">({actualDate})</span>
      {title ? (
        <>
          <span className="text-grey-400"> — </span>
          <span className="text-base-black">{title}</span>
        </>
      ) : null}
    </p>
  );
}

function NeedsAttentionCard({
  client,
  isOpen,
  onToggle,
  contentId,
}: {
  client: ClientHealthRow;
  isOpen: boolean;
  onToggle: () => void;
  contentId: string;
}) {
  const isFlex = isFlexClient(client);
  const isExpandable = !isFlex && (client.health_status === 'Red' || client.health_status === 'Amber');
  const heading = client.health_status === 'Red' ? 'Why is this Red?' : 'Why is this Amber?';
  const explainer =
    client.health_status === 'Red'
      ? "Red means no client tasks have been closed in the last 7 days. Marketing and recurring tasks never count, and Initiative or Engagement tasks only count once they're marked Engagement Successful."
      : "Amber means closures are up to date, but no new client tasks have come in for 7+ days. Marketing and recurring tasks never count, and Initiative or Engagement tasks only count once they're marked Engagement Successful.";
  const excludedSummary = formatExcludedClosureSummary(
    client.recent_excluded_closure_count,
    client.recent_excluded_closure_titles
  );
  const recurringSummary = formatRecurringClosureSummary(
    client.recent_recurring_closure_count,
    client.recent_recurring_closure_titles
  );

  const summary = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-base-black">{client.family_name}</p>
        <p className="text-xs text-grey-400">
          {client.assistant_name}
          <span className="mx-1">·</span>
          {client.days_since_last_task == null || client.days_since_last_task > 365
            ? 'No completed tasks yet'
            : `${client.days_since_last_task} day${client.days_since_last_task === 1 ? '' : 's'} since last task`}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {isFlex ? (
          <>
            <FlexTaskPill row={client} />
            <FlexTravelTaskPill row={client} />
          </>
        ) : null}
        {isExpandable ? (
          <ChevronDown
            size={16}
            className={`text-grey-400 transition duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
            aria-hidden="true"
          />
        ) : null}
        <StatusBadge status={client.health_status} />
      </div>
    </div>
  );

  if (!isExpandable) {
    return <div className="rounded-lg border border-sand-300 bg-sand-100 px-3 py-2">{summary}</div>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-sand-300 bg-sand-100">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="w-full px-3 py-2 text-left transition hover:bg-sand-50"
      >
        {summary}
      </button>
      {isOpen ? (
        <div
          id={contentId}
          className="border-t border-sand-300 bg-sand-50 px-3 pb-3 pt-2"
        >
          <p className="text-xs font-semibold tracking-tight text-base-black">{heading}</p>
          <div className="mt-2 space-y-1.5">
            <ReasonLine
              label="Last task closed"
              date={client.last_activity_closed}
              title={client.last_activity_closed_title}
              emptyText="No tasks have ever been closed for this client."
            />
            <ReasonLine
              label="Last new task"
              date={client.last_task_created}
              title={client.last_task_created_title}
              emptyText="No tasks have ever been created for this client."
            />
            {excludedSummary ? <p className="text-xs leading-5 text-grey-400">{excludedSummary}</p> : null}
            {recurringSummary ? <p className="text-xs leading-5 text-grey-400">{recurringSummary}</p> : null}
            <p className="pt-1 text-xs leading-5 text-grey-400">{explainer}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Home() {
  const filtersApi = useOutletContext<UseFiltersResult>();
  const navigate = useNavigate();
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});

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
      <section className="rounded-lg border border-sand-300 bg-white p-5 shadow-sm">
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
            {attentionClients.length === 0 ? (
              <div className="rounded-lg border border-sand-300 bg-sand-100 px-3 py-4 text-center text-sm text-grey-400">
                No clients need attention right now.
              </div>
            ) : (
              <div className="space-y-2">
                {attentionClients.map((client, index) => (
                  <NeedsAttentionCard
                    key={client.family_id}
                    client={client}
                    isOpen={Boolean(expandedClients[client.family_id])}
                    onToggle={() =>
                      setExpandedClients((prev) => ({
                        ...prev,
                        [client.family_id]: !prev[client.family_id]
                      }))
                    }
                    contentId={`needs-attention-${index}`}
                  />
                ))}
              </div>
            )}
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
