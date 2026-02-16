import { useMemo, useState } from 'react';
import { DataTable } from '../components/ui/DataTable';
import { ErrorState } from '../components/ui/ErrorState';
import { SkeletonTable } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useFOHPerformance } from '../hooks/useFOHPerformance';
import { formatDuration } from '../lib/format';

type DateFilterMode = 'this_week' | 'last_week' | 'custom';

const selectBase =
  'h-10 appearance-none rounded-md border border-sand-300 bg-white bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2716%27%20height%3D%2716%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27%23696968%27%20stroke-width%3D%272%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpath%20d%3D%27m6%209%206%206%206-6%27/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_8px_center] bg-no-repeat pl-3 pr-8 text-sm text-base-black focus:border-assistant-dark focus:outline-none focus:ring-2 focus:ring-assistant-dark/20';

const inputBase =
  'h-10 rounded-md border border-sand-300 bg-white px-3 text-sm text-base-black placeholder:text-grey-400 focus:border-assistant-dark focus:outline-none focus:ring-2 focus:ring-assistant-dark/20';

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfWeek(now: Date): Date {
  const start = new Date(now);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfDay(input: Date): Date {
  const end = new Date(input);
  end.setHours(23, 59, 59, 999);
  return end;
}

function toIsoTimestamp(input: Date): string {
  return input.toISOString();
}

function parseDateInput(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function toStatus(avgMinsPerTask: number): 'Green' | 'Amber' | 'Red' | 'N/A' {
  if (avgMinsPerTask === 0) return 'N/A';
  if (avgMinsPerTask < 30) return 'Green';
  if (avgMinsPerTask <= 45) return 'Amber';
  return 'Red';
}

function formatRangeLabel(start: string, end: string): string {
  return `${new Date(start).toLocaleString('en-GB')} - ${new Date(end).toLocaleString('en-GB')}`;
}

export function Performance() {
  const now = new Date();
  const thisWeekStart = startOfWeek(now);
  const [dateFilter, setDateFilter] = useState<DateFilterMode>('this_week');
  const [customStartDate, setCustomStartDate] = useState(toDateInputValue(thisWeekStart));
  const [customEndDate, setCustomEndDate] = useState(toDateInputValue(now));
  const [expandedAssistantId, setExpandedAssistantId] = useState<string | null>(null);

  const range = useMemo(() => {
    const currentNow = new Date();

    if (dateFilter === 'this_week') {
      const start = startOfWeek(currentNow);
      return {
        startDate: toIsoTimestamp(start),
        endDate: toIsoTimestamp(currentNow)
      };
    }

    if (dateFilter === 'last_week') {
      const thisWeekStartDate = startOfWeek(currentNow);
      const start = new Date(thisWeekStartDate);
      start.setDate(start.getDate() - 7);
      const end = new Date(thisWeekStartDate);
      end.setMilliseconds(-1);
      return {
        startDate: toIsoTimestamp(start),
        endDate: toIsoTimestamp(end)
      };
    }

    const customStart = parseDateInput(customStartDate);
    const customEnd = endOfDay(parseDateInput(customEndDate));
    return {
      startDate: toIsoTimestamp(customStart),
      endDate: toIsoTimestamp(customEnd)
    };
  }, [dateFilter, customStartDate, customEndDate]);

  const performance = useFOHPerformance(range);
  const rows = performance.data ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border-l-4 border-l-assistant-dark border border-sand-300 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-base-black">FOH Performance</h1>
        <p className="mt-1 text-sm text-grey-400">
          Tasks completed and average time per task for FOH assistants.
        </p>
      </section>

      <section className="rounded-lg border border-sand-300 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-48 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-grey-400">
            Date Range
            <select
              className={selectBase}
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value as DateFilterMode)}
              aria-label="Date range filter"
            >
              <option value="this_week">This Week</option>
              <option value="last_week">Last Week</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          {dateFilter === 'custom' && (
            <>
              <label className="flex min-w-44 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-grey-400">
                Start Date
                <input
                  type="date"
                  className={inputBase}
                  value={customStartDate}
                  onChange={(event) => setCustomStartDate(event.target.value)}
                />
              </label>

              <label className="flex min-w-44 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-grey-400">
                End Date
                <input
                  type="date"
                  className={inputBase}
                  value={customEndDate}
                  onChange={(event) => setCustomEndDate(event.target.value)}
                />
              </label>
            </>
          )}
        </div>
      </section>

      {performance.error && (
        <ErrorState
          message="Failed to load FOH performance data."
          onRetry={() => performance.refetch()}
        />
      )}

      {performance.isLoading ? (
        <SkeletonTable rows={8} cols={5} />
      ) : !performance.error ? (
        <section>
          <DataTable
            data={rows}
            rowKey={(row) => row.assistant_id}
            caption="FOH performance table"
            emptyMessage="No FOH performance data for the selected range."
            onRowClick={(row) =>
              setExpandedAssistantId((prev) => (prev === row.assistant_id ? null : row.assistant_id))
            }
            expandedRowKey={expandedAssistantId}
            renderExpanded={(row) => (
              <div className="space-y-2 text-sm text-base-black">
                <div>
                  <span className="font-semibold">Range:</span> {formatRangeLabel(range.startDate, range.endDate)}
                </div>
                <div>
                  <span className="font-semibold">Tasks completed:</span> {row.tasks_completed}
                </div>
                <div>
                  <span className="font-semibold">Average minutes per task:</span>{' '}
                  {formatDuration(row.avg_mins_per_task)}
                </div>
              </div>
            )}
            columns={[
              {
                key: 'assistant',
                header: 'Assistant',
                sortable: true,
                value: (row) => row.assistant_name,
                render: (row) => row.assistant_name
              },
              {
                key: 'completed',
                header: 'Tasks Completed',
                sortable: true,
                value: (row) => row.tasks_completed,
                render: (row) => row.tasks_completed
              },
              {
                key: 'avg',
                header: 'Avg Mins/Task',
                sortable: true,
                value: (row) => row.avg_mins_per_task,
                render: (row) => formatDuration(row.avg_mins_per_task)
              },
              {
                key: 'clients',
                header: 'Clients',
                sortable: true,
                value: (row) => row.client_count,
                render: (row) => row.client_count
              },
              {
                key: 'status',
                header: 'Status',
                sortable: true,
                value: (row) => {
                  const status = toStatus(row.avg_mins_per_task);
                  if (status === 'N/A') return 0;
                  if (status === 'Green') return 1;
                  if (status === 'Amber') return 2;
                  return 3;
                },
                render: (row) => <StatusBadge status={toStatus(row.avg_mins_per_task)} />
              }
            ]}
          />
        </section>
      ) : null}
    </div>
  );
}
