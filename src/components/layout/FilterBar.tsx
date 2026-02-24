import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAssistants } from '../../hooks/useAssistants';
import { useFamilies } from '../../hooks/useFamilies';
import { shouldLogFilters, TimePeriod, UseFiltersResult } from '../../hooks/useFilters';

interface FilterBarProps {
  filtersApi: UseFiltersResult;
  planFilter?: 'contract' | 'subscription_type';
  clientFilterMode?: 'select' | 'search';
  visibleFilters?: Array<'period' | 'assistant' | 'client' | 'plan' | 'status' | 'search'>;
}

const periodOptions: Array<{ label: string; value: TimePeriod }> = [
  { label: 'All Time', value: 'all_time' },
  { label: 'Last 7 Days', value: 'last_7_days' },
  { label: 'This Week', value: 'this_week' },
  { label: 'Last Week', value: 'last_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Last 30 Days', value: 'last_30_days' },
  { label: 'Last 90 Days', value: 'last_90_days' },
  { label: 'Custom', value: 'custom' }
];

const subscriptionTypeOptions = ['Unlimited', 'Flex', 'Free'];

const selectBase =
  'h-10 appearance-none rounded-md border border-sand-300 bg-white bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2716%27%20height%3D%2716%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27%23696968%27%20stroke-width%3D%272%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpath%20d%3D%27m6%209%206%206%206-6%27/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_8px_center] bg-no-repeat pl-3 pr-8 text-sm text-base-black focus:border-assistant-dark focus:outline-none focus:ring-2 focus:ring-assistant-dark/20';

export function FilterBar({
  filtersApi,
  planFilter = 'contract',
  clientFilterMode = 'select',
  visibleFilters = ['period', 'assistant', 'client', 'plan', 'status', 'search']
}: FilterBarProps) {
  const { filters, setFilter, clearFilters } = filtersApi;
  const assistants = useAssistants();
  const families = useFamilies();
  const [clientSearch, setClientSearch] = useState('');
  const useSubscriptionType = planFilter === 'subscription_type';
  const visible = new Set(visibleFilters);

  const setAndLog = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    if (shouldLogFilters) {
      // eslint-disable-next-line no-console
      console.info('[filters:change]', { key, value });
    }
    setFilter(key, value);
  };

  const contractOptions = useMemo(() => {
    return Array.from(
      new Set((families.data ?? []).map((f) => f.contract).filter((contract) => Boolean(contract)))
    ) as string[];
  }, [families.data]);

  const selectedClientName = useMemo(() => {
    const selectedId = filters.client[0];
    if (!selectedId) return '';
    return (families.data ?? []).find((family) => family.id === selectedId)?.family_name ?? '';
  }, [families.data, filters.client]);

  useEffect(() => {
    setClientSearch(selectedClientName);
  }, [selectedClientName]);

  return (
    <fieldset className="rounded-lg border border-sand-300 bg-white p-3 shadow-sm">
      <legend className="sr-only">Dashboard Filters</legend>
      <div className="flex flex-wrap items-center gap-3">
        {visible.has('period') && (
          <select
            className={`${selectBase} min-w-52`}
            value={filters.period}
            onChange={(event) => setAndLog('period', event.target.value as TimePeriod)}
            aria-label="Filter by time period"
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {visible.has('assistant') && (
          <select
            className={`${selectBase} min-w-48`}
            value={filters.assistant[0] ?? ''}
            onChange={(event) => setAndLog('assistant', event.target.value ? [event.target.value] : [])}
            aria-label="Filter by assistant"
          >
            <option value="">All Assistants</option>
            {(assistants.data ?? []).map((assistant) => (
              <option key={assistant.id} value={assistant.id}>
                {assistant.name}
              </option>
            ))}
          </select>
        )}

        {visible.has('client') &&
          (clientFilterMode === 'search' ? (
            <div className="relative min-w-64 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-grey-400" size={16} />
              <input
                type="text"
                list="client-filter-options"
                placeholder="Search clients..."
                value={clientSearch}
                onChange={(event) => {
                  const value = event.target.value;
                  setClientSearch(value);
                  if (!value.trim()) {
                    setAndLog('client', []);
                    return;
                  }
                  const exactMatch = (families.data ?? []).find(
                    (family) => family.family_name.toLowerCase() === value.trim().toLowerCase()
                  );
                  if (exactMatch) {
                    setAndLog('client', [exactMatch.id]);
                  }
                }}
                className="h-10 w-full rounded-md border border-sand-300 bg-white pl-9 pr-3 text-sm text-base-black placeholder:text-grey-400 focus:border-assistant-dark focus:outline-none focus:ring-2 focus:ring-assistant-dark/20"
                aria-label="Search clients"
              />
              <datalist id="client-filter-options">
                {(families.data ?? []).map((family) => (
                  <option key={family.id} value={family.family_name} />
                ))}
              </datalist>
            </div>
          ) : (
            <select
              className={`${selectBase} min-w-48`}
              value={filters.client[0] ?? ''}
              onChange={(event) => setAndLog('client', event.target.value ? [event.target.value] : [])}
              aria-label="Filter by client"
            >
              <option value="">All Clients</option>
              {(families.data ?? []).map((family) => (
                <option key={family.id} value={family.id}>
                  {family.family_name}
                </option>
              ))}
            </select>
          ))}

        {visible.has('plan') && (
          <select
            className={`${selectBase} min-w-44`}
            value={filters.contract[0] ?? ''}
            onChange={(event) => setAndLog('contract', event.target.value ? [event.target.value] : [])}
            aria-label={useSubscriptionType ? 'Filter by plan' : 'Filter by contract'}
          >
            <option value="">{useSubscriptionType ? 'All Plans' : 'All Contracts'}</option>
            {(useSubscriptionType ? subscriptionTypeOptions : contractOptions).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        )}

        {visible.has('status') && (
          <select
            className={`${selectBase} min-w-36`}
            value={filters.status[0] ?? ''}
            onChange={(event) => setAndLog('status', event.target.value ? [event.target.value] : [])}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            {[
              { label: 'Red', value: 'Red' },
              { label: 'Amber', value: 'Amber' },
              { label: 'Renew', value: 'Purple' },
              { label: 'Green', value: 'Green' }
            ].map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        )}

        {visible.has('search') && (
          <div className="relative ml-auto min-w-[280px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-grey-400" size={16} />
            <input
              type="text"
              placeholder="Search clients or assistants..."
              className="h-10 w-full rounded-md border border-sand-300 bg-white pl-9 pr-3 text-sm text-base-black placeholder:text-grey-400 focus:border-assistant-dark focus:outline-none focus:ring-2 focus:ring-assistant-dark/20"
              aria-label="Search clients or assistants"
            />
          </div>
        )}

        <button
          type="button"
          onClick={clearFilters}
          className="inline-flex h-10 items-center gap-1 rounded-md px-2 text-sm text-grey-400 transition-colors duration-150 hover:bg-sand-100 hover:text-base-black"
          aria-label="Clear filters"
        >
          <X size={14} />
          Clear
        </button>
      </div>
    </fieldset>
  );
}
