import { useOutletContext } from 'react-router-dom';
import { FilterBar } from '../components/layout/FilterBar';
import { CapacityBar } from '../components/ui/CapacityBar';
import { DataTable } from '../components/ui/DataTable';
import { ErrorState } from '../components/ui/ErrorState';
import { SkeletonStatCards, SkeletonTable } from '../components/ui/Skeleton';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useFOHCapacity } from '../hooks/useFOHCapacity';
import { UseFiltersResult } from '../hooks/useFilters';

export function Capacity() {
  const filtersApi = useOutletContext<UseFiltersResult>();
  const capacity = useFOHCapacity(filtersApi.filters);

  const rows = capacity.data ?? [];
  const totalClients = rows.reduce((sum, row) => sum + row.current_clients, 0);
  const availableSlots = rows.reduce((sum, row) => sum + row.available_slots, 0);
  const atCapacity = rows.filter((row) => row.current_clients >= row.max_capacity).length;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border-l-4 border-l-assistant-dark border border-sand-300 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-base-black">Capacity</h1>
        <p className="mt-1 text-sm text-grey-400">Overview of client loads and available slots across the FOH team.</p>
      </section>
      <FilterBar filtersApi={filtersApi} visibleFilters={['assistant']} />

      {capacity.error && (
        <ErrorState message="Failed to load capacity data." onRetry={() => capacity.refetch()} />
      )}

      {capacity.isLoading ? (
        <>
          <SkeletonStatCards count={3} />
          <SkeletonTable rows={5} cols={7} />
        </>
      ) : !capacity.error && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard label="Total Clients" value={totalClients} />
            <StatCard label="Available Slots" value={availableSlots} />
            <StatCard label="At/Over Capacity" value={atCapacity} />
          </div>

          <section>
            <h2 className="mb-2 text-lg font-bold text-base-black">FOH Capacity</h2>
            <DataTable
              data={rows}
              rowKey={(row) => row.assistant_id}
              caption="FOH capacity overview"
              emptyMessage="No capacity data available."
              columns={[
                { key: 'assistant', header: 'Assistant', render: (row) => row.assistant_name, sortable: true, value: (row) => row.assistant_name },
                { key: 'clients', header: 'Clients', render: (row) => row.current_clients, sortable: true, value: (row) => row.current_clients },
                { key: 'base', header: 'Base', render: (row) => row.base_capacity, sortable: true, value: (row) => row.base_capacity },
                { key: 'max', header: 'Max', render: (row) => row.max_capacity, sortable: true, value: (row) => row.max_capacity },
                { key: 'available', header: 'Available', render: (row) => row.available_slots, sortable: true, value: (row) => row.available_slots },
                { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.capacity_status} /> },
                { key: 'bar', header: 'Capacity', render: (row) => <CapacityBar current={row.current_clients} base={row.base_capacity} max={row.max_capacity} /> }
              ]}
            />
          </section>
        </>
      )}
    </div>
  );
}
